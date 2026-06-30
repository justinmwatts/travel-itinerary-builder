import { useInfiniteQuery } from "@tanstack/react-query";
import type { FeedResponse } from "@travel/shared";
import { apiRequest } from "../../lib/apiClient";

// Keyset-paginated public feed. The query key includes q so a search starts a
// fresh paginated list.
export function useFeed(q: string) {
  return useInfiniteQuery({
    queryKey: ["feed", q],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (pageParam) params.set("cursor", pageParam);
      const qs = params.toString();
      return apiRequest<FeedResponse>(`/api/feed${qs ? `?${qs}` : ""}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
