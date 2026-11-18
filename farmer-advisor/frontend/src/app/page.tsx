"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authed") router.replace("/today");
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center">
      <Skeleton className="h-10 w-48" />
    </main>
  );
}
