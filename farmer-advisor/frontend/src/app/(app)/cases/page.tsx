"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CaseList } from "@/components/cases/CaseList";
import { PriceForm } from "@/components/cases/PriceForm";
import type { EscalationStatus } from "@/lib/types";

const FILTERS: { label: string; value: EscalationStatus | undefined }[] = [
  { label: "Open", value: "open" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Closed", value: "closed" },
  { label: "All", value: undefined },
];

export default function CasesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<EscalationStatus | undefined>("open");

  if (user && user.role === "farmer") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <h1 className="font-display text-3xl font-semibold">Cases are for extension officers</h1>
        <p className="mt-2 text-muted">Your account does not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Cases to review</h1>
      <p className="mt-2 text-muted">Questions the advisor passed to a person: chemical doses, serious disease, or low confidence.</p>

      <div role="group" aria-label="Filter cases" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`min-h-11 rounded-full border px-5 font-semibold ${
              filter === option.value ? "border-leaf bg-leaf text-white" : "border-line bg-surface hover:bg-leaf-soft"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <CaseList key={filter ?? "all"} status={filter} />
      </div>

      <details className="mt-10 rounded-2xl border border-line bg-surface px-5 py-4">
        <summary className="min-h-8 cursor-pointer font-display text-xl font-semibold">Add a market price</summary>
        <p className="mt-2 text-muted">The advisor only quotes prices that have been recorded here.</p>
        <PriceForm />
      </details>
    </div>
  );
}
