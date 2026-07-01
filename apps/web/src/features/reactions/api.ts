// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import type { FeedResponse, Itinerary, ReactionSummary, ReactionType } from "@travel/shared";
import { apiRequest } from "../../lib/apiClient";
import { useMe } from "../auth/api";

interface ReactFields {
  heartCount: number;
  likeCount: number;
  myReactions: ReactionType[];
}

// Optimistic delta for a toggle: flip the active state and adjust the count.
function toggled(state: ReactFields, type: ReactionType, active: boolean): ReactFields {
  const nowActive = !active;
  const delta = nowActive ? 1 : -1;
  return {
    heartCount: state.heartCount + (type === "heart" ? delta : 0),
    likeCount: state.likeCount + (type === "like" ? delta : 0),
    myReactions: nowActive
      ? [...state.myReactions, type]
      : state.myReactions.filter((t) => t !== type),
  };
}

// Apply a react-field transform to every cache that holds this itinerary: the
// detail query and all feed pages. Keeps the feed and detail in sync.
function applyEverywhere(
  qc: ReturnType<typeof useQueryClient>,
  itineraryId: string,
  fn: (state: ReactFields) => ReactFields,
) {
  qc.setQueryData<Itinerary>(["itinerary", itineraryId], (it) => (it ? { ...it, ...fn(it) } : it));
  qc.setQueriesData<InfiniteData<FeedResponse>>({ queryKey: ["feed"] }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === itineraryId ? { ...item, ...fn(item) } : item,
        ),
      })),
    };
  });
}

interface ToggleVars {
  itineraryId: string;
  type: ReactionType;
  active: boolean;
}

export function useReactionToggle() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const location = useLocation();

  const mutation = useMutation({
    mutationFn: ({ itineraryId, type, active }: ToggleVars) =>
      active
        ? apiRequest<ReactionSummary>(`/api/itineraries/${itineraryId}/reactions/${type}`, {
            method: "DELETE",
          })
        : apiRequest<ReactionSummary>(`/api/itineraries/${itineraryId}/reactions`, {
            method: "POST",
            body: JSON.stringify({ type }),
          }),
    onMutate: async ({ itineraryId, type, active }) => {
      await qc.cancelQueries({ queryKey: ["itinerary", itineraryId] });
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prevItinerary = qc.getQueryData(["itinerary", itineraryId]);
      const prevFeed = qc.getQueriesData({ queryKey: ["feed"] });
      applyEverywhere(qc, itineraryId, (s) => toggled(s, type, active));
      return { prevItinerary, prevFeed, itineraryId };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(["itinerary", ctx.itineraryId], ctx.prevItinerary);
      for (const [key, data] of ctx.prevFeed) qc.setQueryData(key, data);
    },
    onSuccess: (summary, { itineraryId }) => {
      // Reconcile with the authoritative server counts and state.
      applyEverywhere(qc, itineraryId, () => summary);
    },
  });

  function toggle(itineraryId: string, type: ReactionType, active: boolean) {
    if (!me) {
      navigate("/login", { state: { from: location } });
      return;
    }
    mutation.mutate({ itineraryId, type, active });
  }

  return { toggle, isPending: mutation.isPending };
}
