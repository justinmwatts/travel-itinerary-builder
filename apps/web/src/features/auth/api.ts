import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, LoginRequest, SignupRequest, User } from "@travel/shared";
import { ApiError, apiRequest } from "../../lib/apiClient";

export const meQueryKey = ["me"] as const;

// Resolves to the user when authed, or null when the session cookie is missing
// or invalid (a 401 is the logged-out state, not an error).
async function fetchMe(): Promise<User | null> {
  try {
    const { user } = await apiRequest<AuthResponse>("/api/auth/me");
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: fetchMe });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: ({ user }) => qc.setQueryData(meQueryKey, user),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SignupRequest) =>
      apiRequest<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: ({ user }) => qc.setQueryData(meQueryKey, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData(meQueryKey, null);
    },
  });
}
