"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FarmEditor } from "@/components/farm/FarmEditor";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";

function FarmContent() {
  const welcome = useSearchParams().get("welcome") === "1";
  const profile = useAsync(() => api.profile());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight md:text-4xl">My farm</h1>
      {profile.loading && !profile.data ? (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-96" />
        </div>
      ) : null}
      {profile.error && !profile.data ? (
        <div role="alert" className="rounded-2xl bg-cherry-soft p-5">
          <p className="font-semibold text-cherry">We could not load your farm</p>
          <p className="mt-1">{profile.error.message}</p>
          <Button variant="secondary" className="mt-3" onClick={profile.reload}>
            Try again
          </Button>
        </div>
      ) : null}
      {profile.data ? <FarmEditor profile={profile.data} welcome={welcome} /> : null}
    </div>
  );
}

export default function FarmPage() {
  return (
    <Suspense>
      <FarmContent />
    </Suspense>
  );
}
