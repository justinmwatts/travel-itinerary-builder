import { QueryClient } from "@tanstack/react-query";

// React Query owns all server state. No retries (a 401 should resolve to logged
// out, not retry), and no refetch on window focus to keep the demo predictable.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
