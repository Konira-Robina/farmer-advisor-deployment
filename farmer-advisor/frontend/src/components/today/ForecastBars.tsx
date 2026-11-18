import { formatMm, formatWeekday } from "@/lib/format";

export function ForecastBars({ days }: { days: { date: string; rain_mm: number }[] }) {
  const highest = Math.max(10, ...days.map((day) => day.rain_mm));
  const summary = days.map((day) => `${formatWeekday(day.date)} ${formatMm(day.rain_mm)} millimetres`).join(", ");

  return (
    <figure>
      <figcaption className="sr-only">Expected rain for the next 7 days: {summary}</figcaption>
      <div aria-hidden className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="h-5 text-sm font-semibold tabular-nums leading-5 text-rain-deep">{day.rain_mm > 0 ? formatMm(day.rain_mm) : ""}</span>
            <div className="flex h-24 w-full items-end rounded-lg bg-rain-soft/60">
              <div
                className="w-full rounded-lg bg-rain"
                style={{ height: `${Math.max(day.rain_mm > 0 ? 6 : 0, (day.rain_mm / highest) * 100)}%` }}
              />
            </div>
            <span className="text-sm text-muted">{formatWeekday(day.date)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
