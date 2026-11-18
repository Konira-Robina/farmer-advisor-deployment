import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-3xl font-semibold">This page does not exist</h1>
        <p className="mt-2 text-muted">The link may be old or mistyped.</p>
        <LinkButton href="/today" className="mt-6">
          Go to Today
        </LinkButton>
      </div>
    </main>
  );
}
