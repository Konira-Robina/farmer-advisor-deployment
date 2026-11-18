"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  placement?: "center" | "left";
  hideTitle?: boolean;
}

export function Modal({ open, onClose, title, children, placement = "center", hideTitle = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const position =
    placement === "left"
      ? "m-0 h-dvh max-h-none w-[88vw] max-w-sm rounded-none rounded-r-3xl"
      : "m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`${position} bg-surface p-0 text-ink backdrop:bg-leaf-deep/55 open:animate-rise`}
    >
      <div className="flex max-h-dvh flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          <h2 className={`font-display text-xl font-semibold ${hideTitle ? "sr-only" : ""}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-xl text-muted hover:bg-leaf-soft hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{open ? children : null}</div>
      </div>
    </dialog>
  );
}
