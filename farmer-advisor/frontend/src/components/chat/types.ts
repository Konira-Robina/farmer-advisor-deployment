export interface UiImage {
  id: string;
  url: string;
}

export interface UiMessage {
  key: string;
  id: string | null;
  role: "user" | "assistant";
  content: string;
  images: UiImage[];
  status: "sent" | "sending" | "failed";
  error?: string;
  escalated?: boolean;
  rating: 1 | -1 | null;
  retry?: { text: string; files: File[] };
}
