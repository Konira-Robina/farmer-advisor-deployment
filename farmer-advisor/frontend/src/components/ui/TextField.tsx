"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";

export const inputClasses =
  "min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink placeholder:text-muted/70 focus:border-leaf aria-[invalid=true]:border-cherry";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, hint, error, trailing, id, className = "", ref, ...rest }: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          ref={ref}
          className={`${inputClasses} ${trailing ? "pr-14" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing ? <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div> : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-cherry">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="grid size-11 place-items-center rounded-lg text-muted hover:bg-leaf-soft hover:text-ink"
        >
          {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      }
    />
  );
}
