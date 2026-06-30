import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Destination, Itinerary, MyItinerariesResponse } from "@travel/shared";
import { apiRequest } from "../../lib/apiClient";

export const myItinerariesKey = ["itineraries", "mine"] as const;
export const itineraryKey = (id: string) => ["itinerary", id] as const;

interface CreateDraftResponse {
  id: string;
  title: string;
  status: string;
}

// Creates an empty draft to attach the chat to. Called lazily on the first
// message so opening the builder does not litter empty drafts.
export function createItinerary(): Promise<CreateDraftResponse> {
  return apiRequest<CreateDraftResponse>("/api/itineraries", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function useMyItineraries() {
  return useQuery({
    queryKey: myItinerariesKey,
    queryFn: () => apiRequest<MyItinerariesResponse>("/api/itineraries?mine=true"),
  });
}

export function fetchItinerary(id: string): Promise<Itinerary> {
  return apiRequest<Itinerary>(`/api/itineraries/${id}`);
}

export function useItinerary(id: string | undefined) {
  return useQuery({
    queryKey: id ? itineraryKey(id) : ["itinerary", "none"],
    queryFn: () => fetchItinerary(id as string),
    enabled: Boolean(id),
  });
}

// Sets the creator note on one destination. Returns the updated destination.
export function updateDestinationNote(
  itineraryId: string,
  destId: string,
  note: string | null,
): Promise<Destination> {
  return apiRequest<Destination>(`/api/itineraries/${itineraryId}/destinations/${destId}`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export function useDeleteItinerary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/itineraries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: myItinerariesKey }),
  });
}
