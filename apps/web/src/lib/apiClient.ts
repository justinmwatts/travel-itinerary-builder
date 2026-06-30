// Thin fetch wrapper. Always sends the session cookie (credentials: include),
// speaks JSON, and throws a typed ApiError on non-2xx so callers can branch on
// status (e.g. 401 -> logged out, 409 -> email taken).
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorBody(data: unknown): data is { error: string; code?: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  );
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = isErrorBody(data) ? data.error : res.statusText;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}
