"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { visibleNav } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  if (status !== "authed" || !user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  const items = visibleNav(user.role);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const displayName = user.full_name || user.email;
  const showMobileHeader = !pathname.startsWith("/chat");

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <Link href="/today" aria-label="Farmer Advisor home" className="px-2">
          <Logo />
        </Link>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold ${
                isActive(href) ? "bg-leaf-deep text-white" : "text-ink hover:bg-leaf-soft"
              }`}
            >
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-2 font-semibold">{displayName}</p>
          {user.full_name ? <p className="truncate px-2 text-sm text-muted">{user.email}</p> : null}
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-muted hover:bg-leaf-soft hover:text-ink"
          >
            <LogOut aria-hidden className="size-5" />
            Sign out
          </button>
        </div>
      </aside>

      {showMobileHeader ? (
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:hidden">
          <Link href="/today" aria-label="Farmer Advisor home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="grid size-11 place-items-center rounded-xl text-muted hover:bg-leaf-soft hover:text-ink"
          >
            <LogOut aria-hidden className="size-5" />
          </button>
        </header>
      ) : null}

      <main id="main" className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="grid shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold"
          >
            <span
              className={`grid h-8 w-14 place-items-center rounded-full ${
                isActive(href) ? "bg-maize text-ink" : "text-muted"
              }`}
            >
              <Icon aria-hidden className="size-5" />
            </span>
            <span className={isActive(href) ? "text-ink" : "text-muted"}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
