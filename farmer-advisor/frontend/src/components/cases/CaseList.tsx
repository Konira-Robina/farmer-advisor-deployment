"use client";

import { useState } from "react";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Escalation, EscalationStatus } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";

const STATUS_LABEL: Record<EscalationStatus, string> = { open: "Open", reviewed: "Reviewed", closed: "Closed" };
const STATUS_CLASS: Record<EscalationStatus, string> = {
  open: "bg-maize-soft text-ink",
  reviewed: "bg-leaf-soft text-leaf-deep",
  closed: "bg-line/60 text-muted",
};

export function CaseList({ status }: { status?: EscalationStatus }) {
  const toast = useToast();
  const cases = useAsync(() => api.escalations(status));
  const [busy, setBusy] = useState<string | null>(null);

  async function change(item: Escalation, next: EscalationStatus) {
    setBusy(item.id);
    try {
      await api.updateEscalation(item.id, next);
      toast(`Case marked as ${STATUS_LABEL[next].toLowerCase()}.`);
      await cases.reload();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Could not update the case.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (cases.loading && !cases.data) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (cases.error && !cases.data) {
    return (
      <div role="alert" className="rounded-2xl bg-cherry-soft p-5">
        <p className="font-semibold text-cherry">Cases could not be loaded</p>
        <p className="mt-1">{cases.error.message}</p>
        <Button variant="secondary" className="mt-3" onClick={cases.reload} icon={<RefreshCw aria-hidden className="size-4" />}>
          Try again
        </Button>
      </div>
    );
  }

  const items = cases.data ?? [];
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line bg-surface p-6 text-muted">No cases here. New ones appear when the advisor asks for an officer to review a question.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{item.farmer_name || item.farmer_email}</p>
              {item.farmer_name ? <p className="text-sm text-muted">{item.farmer_email}</p> : null}
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[item.status]}`}>{STATUS_LABEL[item.status]}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap">{item.reason}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
            <span>{formatDateTime(item.created_at)}</span>
            {item.latitude !== null && item.longitude !== null ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=13/${item.latitude}/${item.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-leaf underline underline-offset-2"
              >
                <MapPin aria-hidden className="size-4" />
                {item.location_name || "View farm on map"}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.status === "open" ? (
              <Button size="sm" loading={busy === item.id} onClick={() => change(item, "reviewed")}>
                Mark as reviewed
              </Button>
            ) : null}
            {item.status !== "closed" ? (
              <Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => change(item, "closed")}>
                Close case
              </Button>
            ) : null}
            {item.status !== "open" ? (
              <Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => change(item, "open")}>
                Reopen
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
