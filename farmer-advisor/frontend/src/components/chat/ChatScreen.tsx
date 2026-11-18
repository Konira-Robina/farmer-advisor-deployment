"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { AppConfig } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { Composer, type ComposerHandle } from "./Composer";
import { EmptyChat } from "./EmptyChat";
import { ImageViewer } from "./ImageViewer";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { ThreadList } from "./ThreadList";
import { useChat } from "./useChat";

const DEFAULT_CONFIG: AppConfig = { max_images: 3, max_image_mb: 5, vision_enabled: false, max_message_chars: 1000 };

export function ChatScreen({ threadId }: { threadId: string | null }) {
  const searchParams = useSearchParams();
  const ask = searchParams.get("ask") ?? "";
  const chat = useChat(threadId);
  const config = useAsync(() => api.config());
  const profile = useAsync(() => api.profile());
  const [viewer, setViewer] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const settings = config.data ?? DEFAULT_CONFIG;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [chat.messages.length, chat.sending]);

  const empty = !chat.loading && !chat.loadError && chat.messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)} icon={<History aria-hidden className="size-5" />}>
          Chats
        </Button>
        <Link
          href="/chat"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-maize px-3 font-semibold hover:bg-[#e3b11f]"
        >
          <Plus aria-hidden className="size-5" />
          New chat
        </Link>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6"
      >
        <div className="mx-auto max-w-3xl">
          {chat.loading ? (
            <div aria-busy="true" className="space-y-4">
              <Skeleton className="ml-auto h-12 w-2/3" />
              <Skeleton className="h-24 w-4/5" />
              <Skeleton className="ml-auto h-12 w-1/2" />
            </div>
          ) : null}

          {chat.loadError ? (
            <div role="alert" className="rounded-2xl bg-cherry-soft p-5">
              <p className="font-semibold text-cherry">This chat could not be loaded</p>
              <p className="mt-1">{chat.loadError}</p>
              <Button variant="secondary" className="mt-3" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          ) : null}

          {empty ? (
            <EmptyChat
              profile={profile.data}
              visionEnabled={settings.vision_enabled}
              onPick={(text) => void chat.send(text, [])}
              onPickPhoto={() => composerRef.current?.openPicker()}
            />
          ) : null}

          <ul className="space-y-5">
            {chat.messages.map((message) => (
              <MessageBubble
                key={message.key}
                message={message}
                onRate={chat.rate}
                onRetry={chat.retry}
                onDismiss={chat.dismiss}
                onOpenImage={setViewer}
              />
            ))}
            {chat.sending ? <TypingIndicator /> : null}
          </ul>
          <div ref={endRef} />
        </div>
      </div>

      <Composer
        ref={composerRef}
        key={ask}
        onSend={(text, files) => void chat.send(text, files)}
        disabled={chat.sending}
        maxChars={settings.max_message_chars}
        maxImages={settings.max_images}
        visionEnabled={settings.vision_enabled}
        initialText={ask}
      />

      <ImageViewer url={viewer} onClose={() => setViewer(null)} />
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Your chats" placement="left">
        <ThreadList currentId={threadId} onNavigate={() => setHistoryOpen(false)} />
      </Modal>
    </div>
  );
}
