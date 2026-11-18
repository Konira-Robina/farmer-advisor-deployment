"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { Camera, SendHorizontal, X } from "lucide-react";
import { ACCEPT_ATTRIBUTE, checkImageFile } from "@/lib/image";

const RAW_LIMIT_MB = 20;

interface Attachment {
  file: File;
  url: string;
}

export interface ComposerHandle {
  openPicker: () => void;
}

export interface ComposerProps {
  ref?: Ref<ComposerHandle>;
  onSend: (text: string, files: File[]) => void;
  disabled?: boolean;
  maxChars: number;
  maxImages: number;
  visionEnabled: boolean;
  initialText?: string;
}

export function Composer({ onSend, disabled = false, maxChars, maxImages, visionEnabled, initialText = "", ref }: ComposerProps) {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<Attachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  });

  useImperativeHandle(ref, () => ({ openPicker: () => inputRef.current?.click() }), []);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    },
    [],
  );

  useLayoutEffect(() => {
    const area = textareaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 160)}px`;
  }, [text]);

  const tooLong = text.length > maxChars;
  const hasContent = text.trim().length > 0 || attachments.length > 0;
  const canSend = hasContent && !tooLong && !disabled;

  function submit() {
    if (!canSend) return;
    onSend(text, attachments.map((attachment) => attachment.file));
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    setAttachments([]);
    setText("");
    setFileError(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault();
      submit();
    }
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;
    const room = maxImages - attachments.length;
    const accepted: Attachment[] = [];
    let problem: string | null = null;
    for (const file of picked) {
      if (accepted.length >= room) {
        problem = `You can add up to ${maxImages} photos.`;
        break;
      }
      const issue = checkImageFile(file, RAW_LIMIT_MB);
      if (issue) {
        problem = issue;
        continue;
      }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }
    setFileError(problem);
    if (accepted.length > 0) setAttachments((current) => [...current, ...accepted]);
  }

  function removeAttachment(url: string) {
    URL.revokeObjectURL(url);
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
    setFileError(null);
  }

  const showCounter = text.length > maxChars * 0.8;

  return (
    <form onSubmit={onSubmit} className="border-t border-line bg-paper px-3 pb-3 pt-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        {fileError ? (
          <p role="alert" className="mb-2 rounded-xl bg-cherry-soft px-3 py-2 text-sm font-semibold text-cherry">
            {fileError}
          </p>
        ) : null}

        <div className="rounded-3xl border border-line bg-surface p-2 focus-within:border-leaf focus-within:ring-2 focus-within:ring-rain/40">
          {attachments.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-2 px-1 pt-1">
              {attachments.map((attachment) => (
                <li key={attachment.url} className="relative">
                  <img src={attachment.url} alt="Photo ready to send" className="size-20 rounded-2xl object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.url)}
                    aria-label="Remove photo"
                    className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-ink text-white shadow"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-end gap-2">
            {visionEnabled ? (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  multiple
                  tabIndex={-1}
                  aria-hidden
                  className="sr-only"
                  onChange={onFiles}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={attachments.length >= maxImages || disabled}
                  aria-label="Add a photo"
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-leaf hover:bg-leaf-soft disabled:opacity-45"
                >
                  <Camera aria-hidden className="size-6" />
                </button>
              </>
            ) : null}

            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your farm"
              aria-invalid={tooLong || undefined}
              className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 placeholder:text-muted/75 focus-visible:outline-none"
            />

            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-leaf text-white hover:bg-leaf-deep disabled:bg-line disabled:text-muted"
            >
              <SendHorizontal aria-hidden className="size-6" />
            </button>
          </div>
        </div>

        {showCounter ? (
          <p className={`mt-1.5 text-right text-sm ${tooLong ? "font-semibold text-cherry" : "text-muted"}`}>
            {text.length} of {maxChars} characters
          </p>
        ) : null}
      </div>
    </form>
  );
}
