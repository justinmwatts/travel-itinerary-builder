import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Circle, Flex, HStack } from "@chakra-ui/react";
import { useChatStore } from "../../stores/chatStore";
import { streamChat } from "../../lib/sse";
import { createDraft } from "./api";
import { ChatPanel } from "./ChatPanel";
import { ItineraryPanel } from "./ItineraryPanel";

type MobileTab = "chat" | "itinerary";

function TabButton({
  active,
  badge,
  onClick,
  children,
}: {
  active: boolean;
  badge?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button
      flex="1"
      variant="ghost"
      rounded="none"
      color={active ? "fg" : "fg.muted"}
      borderBottomWidth="2px"
      borderColor={active ? "accent" : "transparent"}
      onClick={onClick}
    >
      <HStack gap="2">
        <span>{children}</span>
        {badge ? <Circle size="2" bg="accent" /> : null}
      </HStack>
    </Button>
  );
}

export function BuilderPage() {
  const title = useChatStore((s) => s.title);
  const destinations = useChatStore((s) => s.destinations);
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const status = useChatStore((s) => s.status);
  const errorMessage = useChatStore((s) => s.errorMessage);

  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [itineraryUpdated, setItineraryUpdated] = useState(false);
  const mobileTabRef = useRef<MobileTab>(mobileTab);
  mobileTabRef.current = mobileTab;

  // Ephemeral builder state resets when leaving the flow.
  useEffect(() => () => useChatStore.getState().reset(), []);

  const runTurn = useCallback(async (userText: string, isRetry: boolean) => {
    const store = useChatStore.getState();
    if (isRetry) store.retryStart();
    else store.startTurn(userText);

    // Lazily create the draft on the first message.
    let id = useChatStore.getState().itineraryId;
    if (!id) {
      try {
        const draft = await createDraft();
        id = draft.id;
        useChatStore.getState().setItineraryId(id);
      } catch {
        useChatStore.getState().failTurn("Could not start a new draft. Try again.");
        return;
      }
    }

    await streamChat(
      { itineraryId: id, userMessage: userText },
      {
        onToken: (delta) => useChatStore.getState().appendToken(delta),
        onItinerary: (t, ds) => {
          useChatStore.getState().setItinerary(t, ds);
          if (mobileTabRef.current === "chat") setItineraryUpdated(true);
        },
        onDone: () => useChatStore.getState().finishTurn(),
        onError: (message) => useChatStore.getState().failTurn(message),
      },
    );
  }, []);

  const handleSend = useCallback((text: string) => void runTurn(text, false), [runTurn]);
  const handleRetry = useCallback(() => {
    const last = useChatStore.getState().lastUserMessage;
    if (last) void runTurn(last, true);
  }, [runTurn]);

  return (
    <Flex direction="column" h="calc(100dvh - 64px)">
      <Flex display={{ base: "flex", md: "none" }} borderBottomWidth="1px" borderColor="border">
        <TabButton active={mobileTab === "chat"} onClick={() => setMobileTab("chat")}>
          Chat
        </TabButton>
        <TabButton
          active={mobileTab === "itinerary"}
          badge={itineraryUpdated}
          onClick={() => {
            setMobileTab("itinerary");
            setItineraryUpdated(false);
          }}
        >
          Itinerary
        </TabButton>
      </Flex>

      <Flex flex="1" minH="0">
        <Box
          flex="1"
          minW="0"
          h="100%"
          display={{ base: mobileTab === "chat" ? "block" : "none", md: "block" }}
          borderRightWidth={{ md: "1px" }}
          borderColor="border"
        >
          <ChatPanel
            messages={messages}
            streamingText={streamingText}
            status={status}
            errorMessage={errorMessage}
            onSend={handleSend}
            onRetry={handleRetry}
          />
        </Box>
        <Box
          flex="1"
          minW="0"
          h="100%"
          display={{ base: mobileTab === "itinerary" ? "block" : "none", md: "block" }}
        >
          <ItineraryPanel title={title} destinations={destinations} />
        </Box>
      </Flex>
    </Flex>
  );
}
