import type { ChatRequest, Destination, SseImageUpdate } from "@travel/shared";

// SSE over POST. EventSource only does GET, and the chat turn is a POST whose
// body is the new user message, so we read the streamed response with a fetch
// reader and parse the event/data frames by hand (design.md D7).
export interface ChatStreamHandlers {
  onToken: (delta: string) => void;
  onItinerary: (title: string, destinations: Destination[]) => void;
  onImages: (updates: SseImageUpdate[]) => void;
  onDone: (messageId: string) => void;
  onError: (message: string, code: string) => void;
}

function getString(obj: unknown, key: string): string | undefined {
  if (typeof obj === "object" && obj !== null && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

export async function streamChat(
  body: ChatRequest,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError("Could not reach the server.", "internal");
    return;
  }

  // Pre-stream failures (401/403/404/422) come back as normal JSON.
  if (!res.ok || !res.body) {
    let message = "The request failed.";
    let code = res.status === 401 ? "unauthenticated" : "internal";
    try {
      const data: unknown = await res.json();
      message = getString(data, "error") ?? message;
      code = getString(data, "code") ?? code;
    } catch {
      // non-JSON body; keep defaults
    }
    handlers.onError(message, code);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        dispatchFrame(frame, handlers);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError("The connection dropped mid-reply.", "timeout");
    }
  }
}

function dispatchFrame(frame: string, handlers: ChatStreamHandlers): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  switch (event) {
    case "token":
      handlers.onToken(getString(data, "delta") ?? "");
      break;
    case "itinerary": {
      const title = getString(data, "title") ?? "";
      const destinations =
        typeof data === "object" &&
        data !== null &&
        Array.isArray((data as { destinations?: unknown }).destinations)
          ? (data as { destinations: Destination[] }).destinations
          : [];
      handlers.onItinerary(title, destinations);
      break;
    }
    case "images": {
      const updates =
        typeof data === "object" &&
        data !== null &&
        Array.isArray((data as { updates?: unknown }).updates)
          ? (data as { updates: SseImageUpdate[] }).updates
          : [];
      handlers.onImages(updates);
      break;
    }
    case "done":
      handlers.onDone(getString(data, "messageId") ?? "");
      break;
    case "error":
      handlers.onError(
        getString(data, "message") ?? "Something went wrong.",
        getString(data, "code") ?? "internal",
      );
      break;
  }
}
