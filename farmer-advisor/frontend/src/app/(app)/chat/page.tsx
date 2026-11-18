import { Suspense } from "react";
import { ChatScreen } from "@/components/chat/ChatScreen";

export default function NewChatPage() {
  return (
    <Suspense>
      <ChatScreen threadId={null} />
    </Suspense>
  );
}
