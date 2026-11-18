import Link from "next/link";
import { Camera, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cropLabel } from "@/lib/crops";
import type { Profile } from "@/lib/types";

interface EmptyChatProps {
  profile: Profile | null;
  visionEnabled: boolean;
  onPick: (text: string) => void;
  onPickPhoto: () => void;
}

export function suggestionsForProfile(profile: Profile | null): string[] {
  const crop = profile?.crops[0] ?? "maize";
  return [
    `Should I plant ${crop} this week?`,
    "What does my soil need?",
    `How do I spot pests on ${cropLabel(crop).toLowerCase()}?`,
    `What is the price of ${crop}?`,
  ];
}

export function EmptyChat({ profile, visionEnabled, onPick, onPickPhoto }: EmptyChatProps) {
  const missingLocation = profile !== null && (profile.latitude === null || profile.longitude === null);

  return (
    <div className="mx-auto flex max-w-xl flex-col px-1 pb-4 pt-6 md:pt-14">
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
        What do you want to know about your farm?
      </h1>
      <p className="mt-2 text-muted">Ask in your own words. I use the weather and soil at your farm.</p>

      {missingLocation ? (
        <Link
          href="/farm"
          className="mt-5 flex items-start gap-3 rounded-2xl bg-maize-soft px-4 py-3 hover:bg-maize/40"
        >
          <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="font-semibold">Set your farm on the map</span> so my advice fits your area.
          </span>
        </Link>
      ) : null}

      <ul className="mt-6 flex flex-col gap-2">
        {suggestionsForProfile(profile).map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => onPick(text)}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2 text-left text-lg hover:bg-leaf-soft"
            >
              {text}
            </button>
          </li>
        ))}
      </ul>

      {visionEnabled ? (
        <div className="mt-6">
          <Button size="lg" variant="secondary" className="w-full" onClick={onPickPhoto} icon={<Camera aria-hidden className="size-6 text-leaf" />}>
            Photograph a sick plant or pest
          </Button>
          <p className="mt-2 text-sm text-muted">Take it close, in daylight, with the damaged part in focus.</p>
        </div>
      ) : null}
    </div>
  );
}
