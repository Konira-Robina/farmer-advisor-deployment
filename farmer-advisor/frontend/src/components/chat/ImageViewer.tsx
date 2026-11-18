"use client";

import { Modal } from "@/components/ui/Modal";

export function ImageViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal open={url !== null} onClose={onClose} title="Photo">
      {url ? <img src={url} alt="Full size photo from your chat" className="max-h-[70dvh] w-full rounded-2xl object-contain" /> : null}
    </Modal>
  );
}
