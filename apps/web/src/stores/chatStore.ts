import { create } from "zustand";
import type { Destination } from "@travel/shared";

// Zustand owns only ephemeral UI state for the builder: the in-flight chat
// conversation, the streaming buffer, and the live itinerary mirror. The durable
// result is persisted server-side per turn; this resets when the user leaves.
export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  incomplete?: boolean;
}

export type ChatStatus = "idle" | "streaming" | "error";

interface ChatState {
  itineraryId: string | null;
  title: string;
  destinations: Destination[];
  messages: DisplayMessage[];
  streamingText: string;
  status: ChatStatus;
  errorMessage: string | null;
  lastUserMessage: string | null;

  setItineraryId: (id: string) => void;
  hydrate: (data: {
    itineraryId: string;
    title: string;
    destinations: Destination[];
    messages: DisplayMessage[];
  }) => void;
  startTurn: (userText: string) => void;
  retryStart: () => void;
  appendToken: (delta: string) => void;
  setItinerary: (title: string, destinations: Destination[]) => void;
  setDestinationNote: (destId: string, note: string | null) => void;
  finishTurn: () => void;
  failTurn: (message: string) => void;
  reset: () => void;
}

let messageCounter = 0;
function localId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

const initialState = {
  itineraryId: null,
  title: "",
  destinations: [] as Destination[],
  messages: [] as DisplayMessage[],
  streamingText: "",
  status: "idle" as ChatStatus,
  errorMessage: null,
  lastUserMessage: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setItineraryId: (id) => set({ itineraryId: id }),

  // Load a persisted draft into the builder so the user can resume it.
  hydrate: (data) =>
    set({
      itineraryId: data.itineraryId,
      title: data.title,
      destinations: data.destinations,
      messages: data.messages,
      streamingText: "",
      status: "idle",
      errorMessage: null,
      lastUserMessage: null,
    }),

  startTurn: (userText) =>
    set((s) => ({
      messages: [...s.messages, { id: localId("u"), role: "user", content: userText }],
      streamingText: "",
      status: "streaming",
      errorMessage: null,
      lastUserMessage: userText,
    })),

  // Re-run the last turn without appending a duplicate user message.
  retryStart: () => set({ status: "streaming", streamingText: "", errorMessage: null }),

  appendToken: (delta) => set((s) => ({ streamingText: s.streamingText + delta })),

  setItinerary: (title, destinations) => set({ title, destinations }),

  setDestinationNote: (destId, note) =>
    set((s) => ({
      destinations: s.destinations.map((d) => (d.id === destId ? { ...d, note } : d)),
    })),

  finishTurn: () =>
    set((s) => {
      const text = s.streamingText.trim();
      const messages = text
        ? [...s.messages, { id: localId("a"), role: "assistant" as const, content: text }]
        : s.messages;
      return { messages, streamingText: "", status: "idle" };
    }),

  // Keep any partial prose as an incomplete assistant turn, then surface retry.
  failTurn: (message) =>
    set((s) => {
      const text = s.streamingText.trim();
      const messages = text
        ? [
            ...s.messages,
            { id: localId("a"), role: "assistant" as const, content: text, incomplete: true },
          ]
        : s.messages;
      return { messages, streamingText: "", status: "error", errorMessage: message };
    }),

  reset: () => set({ ...initialState, destinations: [], messages: [] }),
}));
