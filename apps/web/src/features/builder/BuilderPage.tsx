import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Circle, Flex, HStack, Spinner } from "@chakra-ui/react";
import { useChatStore } from "../../stores/chatStore";
import { streamChat } from "../../lib/sse";
import { useMe } from "../auth/api";
import { createItinerary, useItinerary } from "../itineraries/api";
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: loaded, isPending: loadingDraft, isError: loadError } = useItinerary(id);

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

  const hydratedRef = useRef(false);

  // Ephemeral builder state resets when leaving the flow.
  useEffect(() => () => useChatStore.getState().reset(), []);

  // Resuming a persisted draft: hydrate the store once it loads. A draft that
  // is missing or not the caller's sends them back to /me.
  useEffect(() => {
    if (!id || hydratedRef.current) return;
    if (loadError) {
      navigate("/me", { replace: true });
      return;
    }
    if (!loaded) return;
    if (me && loaded.ownerId !== me.id) {
      navigate("/me", { replace: true });
      return;
    }
    hydratedRef.current = true;
    useChatStore.getState().hydrate({
      itineraryId: loaded.id,
      title: loaded.title,
      destinations: loaded.destinations,
      messages: (loaded.chatMessages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        incomplete: m.incomplete,
      })),
    });
  }, [id, loaded, loadError, me, navigate]);

  const runTurn = useCallback(async (userText: string, isRetry: boolean) => {
    const store = useChatStore.getState();
    if (isRetry) store.retryStart();
    else store.startTurn(userText);

    // Lazily create the draft on the first message (new builder only).
    let itineraryId = useChatStore.getState().itineraryId;
    if (!itineraryId) {
      try {
        const draft = await createItinerary();
        itineraryId = draft.id;
        useChatStore.getState().setItineraryId(itineraryId);
      } catch {
        useChatStore.getState().failTurn("Could not start a new draft. Try again.");
        return;
      }
    }

    await streamChat(
      { itineraryId, userMessage: userText },
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

  // Resuming: hold with a spinner until the draft is loaded and hydrated.
  if (id && (loadingDraft || (!hydratedRef.current && !loadError))) {
    return (
      <Flex h="calc(100dvh - 64px)" align="center" justify="center">
        <Spinner color="accent" />
      </Flex>
    );
  }

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
