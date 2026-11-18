"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThreadList } from "@/components/chat/ThreadList";
import { ThreadsProvider } from "@/components/chat/ThreadsProvider";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentId = pathname.split("/")[2] ?? null;

  return (
    <ThreadsProvider>
      <div className="flex h-full">
        <aside aria-label="Chat history" className="hidden w-72 shrink-0 border-r border-line bg-surface lg:block">
          <ThreadList currentId={currentId} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ThreadsProvider>
  );
}
