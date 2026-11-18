import { MessageCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { cropLabel } from "@/lib/crops";
import { formatHarvestWindow, formatMm } from "@/lib/format";
import { needFraction } from "@/lib/gauge";
import type { CropAdvice } from "@/lib/types";

function NeedBar({ rainfall, required }: { rainfall: number; required: number }) {
  const fraction = needFraction(rainfall, required);
  return (
    <div>
      <div
        role="img"
        aria-label={`${formatMm(rainfall)} millimetres of rain, ${formatMm(required)} needed`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-rain" style={{ width: `${fraction * 100}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {formatMm(rainfall)} mm of rain fell in 30 days. This crop needs {formatMm(required)} mm.
      </p>
    </div>
  );
}

export function CropRow({ advice }: { advice: CropAdvice }) {
  const name = cropLabel(advice.crop);
  const ask = encodeURIComponent(`Should I plant ${advice.crop} now?`);
  const hasRain = advice.status !== "insufficient_data" && advice.required_rainfall_30_days_mm !== undefined;

  return (
    <li className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-display text-2xl font-semibold">{name}</h3>
        <StatusPill status={advice.status} />
      </div>
      <p className="mt-2 max-w-prose">{advice.explanation}</p>

      {hasRain ? (
        <div className="mt-3 max-w-md">
          <NeedBar rainfall={advice.rainfall_last_30_days_mm ?? 0} required={advice.required_rainfall_30_days_mm ?? 0} />
        </div>
      ) : null}

      {advice.notes?.map((note) => (
        <p key={note} className="mt-3 max-w-prose rounded-xl bg-maize-soft px-3 py-2">
          {note}
        </p>
      ))}

      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-muted">
        {advice.expected_harvest_window ? (
          <div>
            <dt className="inline">If you plant now, harvest around </dt>
            <dd className="inline font-semibold text-ink">{formatHarvestWindow(advice.expected_harvest_window)}</dd>
          </div>
        ) : null}
        {advice.ideal_soil_ph ? (
          <div>
            <dt className="inline">Best soil pH </dt>
            <dd className="inline font-semibold text-ink">
              {advice.ideal_soil_ph[0]} to {advice.ideal_soil_ph[1]}
            </dd>
          </div>
        ) : null}
      </dl>

      <LinkButton href={`/chat?ask=${ask}`} variant="secondary" size="sm" className="mt-4" icon={<MessageCircle aria-hidden className="size-4" />}>
        Ask about {name.toLowerCase()}
      </LinkButton>
    </li>
  );
}
