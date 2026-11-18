"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Logo } from "@/components/ui/Logo";

const POINTS = [
  "Know if the rain suits planting your crops today.",
  "Ask in plain words, or send a photo of a sick leaf.",
  "Advice that uses your own farm's location.",
];

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const statusOnArrival = useRef<string | null>(null);

  useEffect(() => {
    if (statusOnArrival.current === null && status !== "loading") statusOnArrival.current = status;
    if (statusOnArrival.current === "authed" && status === "authed") router.replace("/today");
  }, [status, router]);

  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-leaf-deep p-10 text-white md:flex">
        <span className="text-white [&_span:last-child]:text-white">
          <Logo size="lg" />
        </span>
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-maize">
            Plant with the weather on your side.
          </h2>
          <ul className="mt-8 space-y-4 text-lg text-white/90">
            {POINTS.map((point) => (
              <li key={point} className="max-w-md">
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">Made for smallholder farmers in Uganda.</p>
      </aside>

      <main id="main" className="flex flex-col justify-center px-5 py-8 md:px-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 md:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
