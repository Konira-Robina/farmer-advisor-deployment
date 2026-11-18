"use client";

import Link from "next/link";
import { Droplets, MessageCircle, RefreshCw, Thermometer } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CropRow } from "@/components/today/CropRow";
import { ForecastBars } from "@/components/today/ForecastBars";
import { RainGauge } from "@/components/today/RainGauge";
import { SetupPrompt } from "@/components/today/SetupPrompt";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { cropLabel } from "@/lib/crops";
import { formatMm, greeting } from "@/lib/format";
import type { FarmOverview } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading your farm" className="space-y-6">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ProblemState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-2xl bg-cherry-soft p-6">
      <h2 className="font-display text-xl font-semibold text-cherry">We could not load your farm</h2>
      <p className="mt-1">{message}</p>
      <Button onClick={onRetry} variant="secondary" className="mt-4" icon={<RefreshCw aria-hidden className="size-4" />}>
        Try again
      </Button>
    </section>
  );
}

function suggestionsFor(overview: FarmOverview): string[] {
  const first = overview.crops[0]?.crop;
  const label = first ? cropLabel(first).toLowerCase() : "my crops";
  return [
    `Should I plant ${first ?? "maize"} this week?`,
    "What does my soil need?",
    `How do I spot pests on ${label}?`,
    `What is the price of ${first ?? "maize"}?`,
  ];
}

function Overview({ overview }: { overview: FarmOverview }) {
  const weather = overview.weather;
  if (!weather) return null;
  const markers = overview.crops
    .filter((crop) => crop.required_rainfall_30_days_mm !== undefined)
    .map((crop) => ({ crop: crop.crop, required: crop.required_rainfall_30_days_mm as number }));

  return (
    <div className="space-y-10">
      <section aria-labelledby="rain-heading">
        <h2 id="rain-heading" className="font-display text-xl font-semibold">
          Rain on your farm
        </h2>
        <div className="mt-4 flex items-start gap-4 sm:gap-8">
          <RainGauge rainfall={weather.rainfall_last_30_days_mm} markers={markers} />
          <div className="min-w-0 pt-1">
            <p className="font-display text-5xl font-semibold leading-none tracking-tight sm:text-7xl">
              {formatMm(weather.rainfall_last_30_days_mm)}
              <span className="ml-1 text-xl font-medium text-muted sm:text-2xl">mm</span>
            </p>
            <p className="mt-2 text-muted">of rain in the last 30 days</p>
            <ul className="mt-4 space-y-2 text-[0.95rem] sm:mt-5 sm:text-base">
              <li className="flex items-center gap-2">
                <Thermometer aria-hidden className="size-5 text-muted" />
                <span>{Math.round(weather.current.temperature_c)}°C now</span>
              </li>
              <li className="flex items-center gap-2">
                <Droplets aria-hidden className="size-5 text-muted" />
                <span>{Math.round(weather.current.humidity_percent)}% humidity</span>
              </li>
            </ul>
            <p className="mt-4 rounded-xl bg-rain-soft px-3 py-2 text-[0.95rem] font-semibold text-rain-deep sm:mt-5 sm:text-base">
              {formatMm(weather.rainfall_next_7_days_mm)} mm expected in the next 7 days
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="forecast-heading">
        <h2 id="forecast-heading" className="font-display text-xl font-semibold">
          Rain this week
        </h2>
        <div className="mt-3">
          <ForecastBars days={weather.daily_forecast} />
        </div>
      </section>

      <section aria-labelledby="crops-heading">
        <h2 id="crops-heading" className="font-display text-xl font-semibold">
          Your crops
        </h2>
        {overview.crops.length > 0 ? (
          <ul className="mt-4">
            {overview.crops.map((advice) => (
              <CropRow key={advice.crop} advice={advice} />
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <SetupPrompt
              title="Add the crops you grow"
              message="Tell us what you plant and this page will show if the rain suits each crop."
              actionLabel="Choose my crops"
            />
          </div>
        )}
        {overview.unsupported_crops.length > 0 ? (
          <p className="mt-4 text-sm text-muted">
            We do not have planting rules for {overview.unsupported_crops.map(cropLabel).join(", ")} yet. You can still ask the advisor about{" "}
            {overview.unsupported_crops.length === 1 ? "it" : "them"}.
          </p>
        ) : null}
      </section>
    </div>
  );
}

export default function TodayPage() {
  const { user } = useAuth();
  const overview = useAsync(() => api.overview());
  const firstName = (user?.full_name || "").split(" ")[0];
  const data = overview.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8">
        <p className="text-muted">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {data?.location_name ? `Your farm near ${data.location_name}` : "Your farm today"}
        </h1>
      </header>

      {overview.loading && !data ? <LoadingState /> : null}
      {overview.error && !data ? <ProblemState message={overview.error.message} onRetry={overview.reload} /> : null}

      {data && !data.has_location ? (
        <SetupPrompt
          title="Set your farm on the map"
          message="Once we know where your farm is, we can show the rain it has had, the forecast, and whether it suits your crops."
          actionLabel="Set my farm"
        />
      ) : null}

      {data && data.has_location && data.weather_error ? (
        <ProblemState message={data.weather_error} onRetry={overview.reload} />
      ) : null}

      {data && data.has_location && data.weather ? (
        <>
          <Overview overview={data} />
          <section aria-labelledby="ask-heading" className="mt-12 border-t border-line pt-8">
            <h2 id="ask-heading" className="font-display text-xl font-semibold">
              Ask the advisor
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {suggestionsFor(data).map((text) => (
                <li key={text}>
                  <Link
                    href={`/chat?ask=${encodeURIComponent(text)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 hover:bg-leaf-soft"
                  >
                    <MessageCircle aria-hidden className="size-4 text-leaf" />
                    {text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
