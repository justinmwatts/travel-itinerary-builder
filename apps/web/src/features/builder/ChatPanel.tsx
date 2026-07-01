// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Stack, Text, Textarea } from "@chakra-ui/react";
import type { ChatStatus, DisplayMessage } from "../../stores/chatStore";

const STARTERS = ["Weekend city break", "2-week road trip", "Beach and food"];

function Bubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"}>
      <Box
        maxW="80%"
        bg={isUser ? "ink" : "bg.surface"}
        color={isUser ? "paper" : "fg"}
        borderWidth={isUser ? "0" : "1px"}
        borderColor="border"
        rounded="md"
        px="3"
        py="2"
      >
        <Text textStyle="body" whiteSpace="pre-wrap">
          {message.content}
        </Text>
        {message.incomplete ? (
          <Text textStyle="micro" color={isUser ? "paper" : "fg.subtle"} mt="1">
            interrupted
          </Text>
        ) : null}
      </Box>
    </Flex>
  );
}

function TypingDots() {
  return (
    <Text textStyle="body" color="fg.subtle" aria-hidden>
      •••
    </Text>
  );
}

export function ChatPanel({
  messages,
  streamingText,
  status,
  errorMessage,
  onSend,
  onRetry,
}: {
  messages: DisplayMessage[];
  streamingText: string;
  status: ChatStatus;
  errorMessage: string | null;
  onSend: (text: string) => void;
  onRetry: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const streaming = status === "streaming";
  const isEmpty = messages.length === 0 && !streaming;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText, status]);

  function submit() {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft("");
    onSend(text);
  }

  return (
    <Flex direction="column" h="100%">
      <Box flex="1" overflowY="auto" px="5" py="4" ref={scrollRef}>
        {isEmpty ? (
          <Stack gap="4" py="8" align="center" textAlign="center">
            <Text textStyle="body" color="fg.muted" maxW="320px">
              Tell me where you want to go and how long you have. I will draft an itinerary you can
              refine.
            </Text>
            <Flex gap="2" wrap="wrap" justify="center">
              {STARTERS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  borderColor="border"
                  color="fg"
                  onClick={() => onSend(s)}
                >
                  {s}
                </Button>
              ))}
            </Flex>
          </Stack>
        ) : (
          <Stack gap="3" aria-live="polite">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {streaming ? (
              <Flex justify="flex-start">
                <Box
                  maxW="80%"
                  bg="bg.surface"
                  borderWidth="1px"
                  borderColor="border"
                  rounded="md"
                  px="3"
                  py="2"
                >
                  {streamingText ? (
                    <Text textStyle="body" whiteSpace="pre-wrap">
                      {streamingText}
                    </Text>
                  ) : (
                    <TypingDots />
                  )}
                </Box>
              </Flex>
            ) : null}
            {status === "error" ? (
              <Flex justify="flex-start">
                <Box bg="paper" borderWidth="1px" borderColor="danger" rounded="md" px="3" py="2">
                  <Text textStyle="small" color="danger">
                    {errorMessage ?? "Couldn't reach the assistant."}
                  </Text>
                  <Button
                    size="xs"
                    mt="2"
                    variant="outline"
                    borderColor="danger"
                    color="danger"
                    onClick={onRetry}
                  >
                    Retry
                  </Button>
                </Box>
              </Flex>
            ) : null}
          </Stack>
        )}
      </Box>

      <Box borderTopWidth="1px" borderColor="border" p="3">
        <Flex gap="2" align="flex-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            resize="none"
            bg="bg.surface"
            borderColor="border"
            disabled={streaming}
          />
          <Button
            bg="ink"
            color="paper"
            onClick={submit}
            loading={streaming}
            disabled={!draft.trim()}
          >
            Send
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
