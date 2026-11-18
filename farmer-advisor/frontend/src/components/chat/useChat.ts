"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { prepareImage } from "@/lib/image";
import type { ServerMessage } from "@/lib/types";
import type { UiMessage } from "./types";
import { useThreads } from "./ThreadsProvider";

const sessionCache = new Map<string, UiMessage[]>();
let keyCounter = 0;

function nextKey(prefix: string): string {
  keyCounter += 1;
  return `${prefix}-${Date.now()}-${keyCounter}`;
}

export function forgetThread(id: string) {
  sessionCache.delete(id);
}

function fromServer(message: ServerMessage): UiMessage {
  return {
    key: message.id,
    id: message.id,
    role: message.role,
    content: message.content,
    images: message.images,
    status: "sent",
    rating: message.rating === 1 || message.rating === -1 ? message.rating : null,
  };
}

export function describeSendError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429 && error.retryAfter) {
      return `You are sending messages quickly. Try again in ${error.retryAfter} seconds.`;
    }
    return error.message;
  }
  return "Your message could not be sent. Please try again.";
}

export function useChat(initialThreadId: string | null) {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useThreads();

  const cached = initialThreadId ? sessionCache.get(initialThreadId) : undefined;
  const [messages, setMessages] = useState<UiMessage[]>(cached ?? []);
  const [loading, setLoading] = useState(initialThreadId !== null && cached === undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const messagesRef = useRef<UiMessage[]>(messages);
  const threadIdRef = useRef<string | null>(initialThreadId);

  const commit = useCallback((next: UiMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
    if (threadIdRef.current) sessionCache.set(threadIdRef.current, next);
  }, []);

  useEffect(() => {
    if (!initialThreadId || sessionCache.has(initialThreadId)) return;
    let active = true;
    api
      .messages(initialThreadId)
      .then((list) => {
        if (!active) return;
        const mapped = list.map(fromServer);
        messagesRef.current = mapped;
        sessionCache.set(initialThreadId, mapped);
        setMessages(mapped);
        setLoading(false);
      })
      .catch((caught: Error) => {
        if (!active) return;
        setLoadError(caught.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialThreadId]);

  const send = useCallback(
    async (text: string, files: File[]) => {
      const trimmed = text.trim();
      const userKey = nextKey("user");
      const previews = files.map((file, index) => ({ id: `${userKey}-${index}`, url: URL.createObjectURL(file) }));
      commit([
        ...messagesRef.current,
        { key: userKey, id: null, role: "user", content: trimmed, images: previews, status: "sending", rating: null },
      ]);
      setSending(true);

      try {
        const prepared = await Promise.all(files.map((file) => prepareImage(file)));
        const reply = prepared.length
          ? await api.chatWithPhotos(trimmed, threadIdRef.current, prepared)
          : await api.chat(trimmed, threadIdRef.current);

        const delivered = messagesRef.current.map((message) =>
          message.key === userKey ? { ...message, status: "sent" as const } : message,
        );
        commit([
          ...delivered,
          {
            key: `assistant-${reply.message_id}`,
            id: reply.message_id,
            role: "assistant",
            content: reply.reply,
            images: [],
            status: "sent",
            escalated: reply.escalated,
            rating: null,
          },
        ]);

        const isNewThread = threadIdRef.current === null;
        if (isNewThread) {
          threadIdRef.current = reply.thread_id;
          sessionCache.set(reply.thread_id, messagesRef.current);
        }
        void refresh();
        if (isNewThread) router.replace(`/chat/${reply.thread_id}`);
      } catch (caught) {
        commit(
          messagesRef.current.map((message) =>
            message.key === userKey
              ? { ...message, status: "failed" as const, error: describeSendError(caught), retry: { text: trimmed, files } }
              : message,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [commit, refresh, router],
  );

  const retry = useCallback(
    (key: string) => {
      const target = messagesRef.current.find((message) => message.key === key);
      if (!target?.retry) return;
      const { text, files } = target.retry;
      commit(messagesRef.current.filter((message) => message.key !== key));
      void send(text, files);
    },
    [commit, send],
  );

  const dismiss = useCallback(
    (key: string) => commit(messagesRef.current.filter((message) => message.key !== key)),
    [commit],
  );

  const rate = useCallback(
    async (messageId: string, rating: 1 | -1, comment?: string) => {
      const before = messagesRef.current.find((message) => message.id === messageId)?.rating ?? null;
      commit(messagesRef.current.map((message) => (message.id === messageId ? { ...message, rating } : message)));
      try {
        await api.feedback(messageId, rating, comment);
        if (!comment) toast("Thanks for the feedback.");
      } catch (caught) {
        commit(messagesRef.current.map((message) => (message.id === messageId ? { ...message, rating: before } : message)));
        toast(caught instanceof ApiError ? caught.message : "Could not save your feedback.", "error");
      }
    },
    [commit, toast],
  );

  return { messages, loading, loadError, sending, send, retry, dismiss, rate };
}
