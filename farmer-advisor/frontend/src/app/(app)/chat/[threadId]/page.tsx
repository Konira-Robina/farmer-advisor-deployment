"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  return (
    <Suspense>
      <ChatScreen key={threadId} threadId={threadId} />
    </Suspense>
  );
}
