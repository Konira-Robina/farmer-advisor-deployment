"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { groupThreads } from "@/lib/format";
import type { Thread } from "@/lib/types";
import { useThreads } from "./ThreadsProvider";
import { forgetThread } from "./useChat";

interface ThreadListProps {
  currentId: string | null;
  onNavigate?: () => void;
}

export function ThreadList({ currentId, onNavigate }: ThreadListProps) {
  const { threads, loading, error, remove, refresh } = useThreads();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<Thread | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      await api.deleteThread(pending.id);
      forgetThread(pending.id);
      remove(pending.id);
      if (pending.id === currentId) router.replace("/chat");
      toast("Chat deleted.");
      setPending(null);
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Could not delete that chat.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const groups = groupThreads(threads);

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <LinkButton href="/chat" variant="accent" className="w-full" icon={<Plus aria-hidden className="size-5" />}>
          New chat
        </LinkButton>
      </div>

      <nav aria-label="Your chats" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="space-y-2 px-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : null}

        {error && !loading ? (
          <div className="px-3">
            <p className="text-sm text-cherry">{error}</p>
            <button type="button" onClick={refresh} className="mt-2 font-semibold text-leaf underline">
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && threads.length === 0 ? (
          <p className="px-3 text-muted">Your chats will appear here.</p>
        ) : null}

        {groups.map((group) => (
          <section key={group.label} className="mb-4">
            <h3 className="px-3 pb-1 text-sm font-semibold text-muted">{group.label}</h3>
            <ul>
              {group.items.map((thread) => {
                const title = thread.title || "New chat";
                const active = thread.id === currentId;
                return (
                  <li key={thread.id} className="group relative">
                    <Link
                      href={`/chat/${thread.id}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center rounded-xl py-2 pl-3 pr-12 ${
                        active ? "bg-leaf-soft font-semibold text-leaf-deep" : "hover:bg-leaf-soft/60"
                      }`}
                    >
                      <span className="line-clamp-2">{title}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPending(thread)}
                      aria-label={`Delete chat: ${title}`}
                      className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-cherry-soft hover:text-cherry"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this chat?"
        message="The messages and photos in this chat will be removed for good."
        confirmLabel="Delete chat"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
