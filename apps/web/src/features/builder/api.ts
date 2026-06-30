import { apiRequest } from "../../lib/apiClient";

interface CreateDraftResponse {
  id: string;
  title: string;
  status: string;
}

// Creates an empty draft to attach the chat to. Called lazily on the first
// message so opening the builder does not litter empty drafts.
export function createDraft(): Promise<CreateDraftResponse> {
  return apiRequest<CreateDraftResponse>("/api/itineraries", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
