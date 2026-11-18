"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw, Sprout, ThumbsDown, ThumbsUp, UserCheck, X } from "lucide-react";
import type { UiMessage } from "./types";
import { Markdown } from "./Markdown";

const DISLIKE_REASONS = ["The advice was wrong", "Hard to understand", "Too long", "Not about my question"];

interface MessageBubbleProps {
  message: UiMessage;
  onRate: (messageId: string, rating: 1 | -1, comment?: string) => void;
  onRetry: (key: string) => void;
  onDismiss: (key: string) => void;
  onOpenImage: (url: string) => void;
}

function Photos({ message, onOpenImage }: { message: UiMessage; onOpenImage: (url: string) => void }) {
  if (message.images.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap justify-end gap-2">
      {message.images.map((image) => (
        <li key={image.id}>
          <button
            type="button"
            onClick={() => onOpenImage(image.url)}
            aria-label="View photo full size"
            className="block overflow-hidden rounded-2xl"
          >
            <img src={image.url} alt="Photo you sent" className="size-28 object-cover sm:size-36" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Feedback({ message, onRate }: { message: UiMessage; onRate: MessageBubbleProps["onRate"] }) {
  const [reasonSent, setReasonSent] = useState(false);
  if (!message.id) return null;
  const id = message.id;

  const buttonClass = (active: boolean) =>
    `grid size-11 place-items-center rounded-xl border ${
      active ? "border-leaf bg-leaf text-white" : "border-line bg-surface text-muted hover:bg-leaf-soft hover:text-ink"
    }`;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Was this helpful?</span>
        <button type="button" aria-label="Helpful" aria-pressed={message.rating === 1} onClick={() => onRate(id, 1)} className={buttonClass(message.rating === 1)}>
          <ThumbsUp aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Not helpful"
          aria-pressed={message.rating === -1}
          onClick={() => {
            setReasonSent(false);
            onRate(id, -1);
          }}
          className={buttonClass(message.rating === -1)}
        >
          <ThumbsDown aria-hidden className="size-5" />
        </button>
      </div>
      {message.rating === -1 && !reasonSent ? (
        <div className="mt-2">
          <p className="mb-2 text-sm text-muted">What went wrong?</p>
          <ul className="flex flex-wrap gap-2">
            {DISLIKE_REASONS.map((reason) => (
              <li key={reason}>
                <button
                  type="button"
                  onClick={() => {
                    setReasonSent(true);
                    onRate(id, -1, reason);
                  }}
                  className="min-h-10 rounded-full border border-line bg-surface px-4 text-[0.95rem] hover:bg-leaf-soft"
                >
                  {reason}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MessageBubble({ message, onRate, onRetry, onDismiss, onOpenImage }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <li className="flex animate-rise flex-col items-end">
        <Photos message={message} onOpenImage={onOpenImage} />
        {message.content ? (
          <p
            className={`max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-leaf-deep px-4 py-3 text-white ${
              message.status === "sending" ? "opacity-75" : ""
            }`}
          >
            {message.content}
          </p>
        ) : null}
        {message.status === "failed" ? (
          <div role="alert" className="mt-2 flex max-w-[85%] flex-col items-end gap-2">
            <p className="flex items-start gap-2 text-sm font-semibold text-cherry">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {message.error}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRetry(message.key)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-leaf px-4 font-semibold text-white hover:bg-leaf-deep"
              >
                <RefreshCw aria-hidden className="size-4" />
                Send again
              </button>
              <button
                type="button"
                onClick={() => onDismiss(message.key)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 hover:bg-leaf-soft"
              >
                <X aria-hidden className="size-4" />
                Remove
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <li className="flex animate-rise gap-3">
      <span aria-hidden className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-leaf-deep text-maize">
        <Sprout className="size-5" />
      </span>
      <div className="min-w-0 max-w-[90%]">
        <div className="rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-3">
          <Markdown>{message.content}</Markdown>
        </div>
        {message.escalated ? (
          <p role="note" className="mt-2 flex items-start gap-2 rounded-2xl bg-maize-soft px-4 py-3">
            <UserCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>An extension officer has been asked to review this. For anything urgent, visit your local agricultural office.</span>
          </p>
        ) : null}
        <Feedback message={message} onRate={onRate} />
      </div>
    </li>
  );
}

export function TypingIndicator() {
  return (
    <li className="flex gap-3" aria-label="The advisor is writing a reply">
      <span aria-hidden className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-leaf-deep text-maize">
        <Sprout className="size-5" />
      </span>
      <div className="flex items-center gap-1.5 rounded-3xl rounded-tl-lg border border-line bg-surface px-5 py-4" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-2.5 animate-bounce rounded-full bg-leaf motion-reduce:animate-none"
            style={{ animationDelay: `${dot * 140}ms` }}
          />
        ))}
      </div>
    </li>
  );
}
