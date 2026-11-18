import type {
  AppConfig,
  ChatReply,
  Escalation,
  EscalationStatus,
  FarmOverview,
  PriceInput,
  Profile,
  ProfileInput,
  ServerMessage,
  Thread,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;
  retryAfter: number | null;

  constructor(status: number, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: "That request could not be completed.",
  401: "Please sign in again.",
  403: "You do not have permission to do that.",
  404: "We could not find that.",
  413: "That is too large to send.",
  429: "You are sending messages too quickly. Please wait a moment.",
  500: "Something went wrong on our side. Please try again.",
  502: "We could not reach the advisor. Check your connection and try again.",
  503: "The advisor is not available right now. Please try again shortly.",
  504: "We could not reach the advisor. Check your connection and try again.",
};

function readDetail(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item.msg === "string" ? item.msg.replace(/^Value error, /, "") : ""))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return FALLBACK_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

const NO_AUTH_REDIRECT = new Set(["/api/auth/login", "/api/auth/register", "/api/auth/me"]);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your internet connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !NO_AUTH_REDIRECT.has(path)) unauthorizedHandler?.();
    const retry = Number(response.headers.get("Retry-After"));
    throw new ApiError(response.status, readDetail(body, response.status), Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return body as T;
}

function json(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export const api = {
  register: (email: string, password: string, fullName: string) =>
    request<User>("/api/auth/register", json("POST", { email, password, full_name: fullName || null })),
  login: (email: string, password: string) => request<User>("/api/auth/login", json("POST", { email, password })),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),

  config: () => request<AppConfig>("/api/config"),
  profile: () => request<Profile>("/api/profile"),
  saveProfile: (input: ProfileInput) => request<Profile>("/api/profile", json("PUT", input)),
  overview: () => request<FarmOverview>("/api/farm/overview"),

  threads: () => request<Thread[]>("/api/threads"),
  messages: (threadId: string) => request<ServerMessage[]>(`/api/threads/${threadId}/messages`),
  deleteThread: (threadId: string) => request<void>(`/api/threads/${threadId}`, { method: "DELETE" }),
  chat: (message: string, threadId: string | null) =>
    request<ChatReply>("/api/chat", json("POST", { message, thread_id: threadId })),
  chatWithPhotos: (message: string, threadId: string | null, photos: File[]) => {
    const form = new FormData();
    form.append("message", message);
    if (threadId) form.append("thread_id", threadId);
    photos.forEach((photo) => form.append("photos", photo));
    return request<ChatReply>("/api/chat/upload", { method: "POST", body: form });
  },
  feedback: (messageId: string, rating: 1 | -1, comment?: string) =>
    request(`/api/messages/${messageId}/feedback`, json("POST", { rating, comment: comment ?? null })),

  escalations: (status?: EscalationStatus) =>
    request<Escalation[]>(`/api/escalations${status ? `?status=${status}` : ""}`),
  updateEscalation: (id: string, status: EscalationStatus) =>
    request<{ id: string; status: EscalationStatus }>(`/api/escalations/${id}`, json("PATCH", { status })),
  addPrice: (input: PriceInput) => request("/api/admin/prices", json("POST", input)),
};
