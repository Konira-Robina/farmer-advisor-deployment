import { MapPin } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

interface SetupPromptProps {
  title: string;
  message: string;
  actionLabel: string;
}

export function SetupPrompt({ title, message, actionLabel }: SetupPromptProps) {
  return (
    <section className="rounded-2xl border border-dashed border-leaf/50 bg-surface p-6 md:p-8">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-prose text-muted">{message}</p>
      <LinkButton href="/farm" size="lg" className="mt-5" icon={<MapPin aria-hidden className="size-5" />}>
        {actionLabel}
      </LinkButton>
    </section>
  );
}
