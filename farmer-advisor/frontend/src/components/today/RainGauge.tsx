import { useId } from "react";
import { gaugeScale, spreadLabels, tickValues } from "@/lib/gauge";
import { cropLabel } from "@/lib/crops";
import { formatMm } from "@/lib/format";

export interface GaugeMarker {
  crop: string;
  required: number;
}

const TUBE = { x: 44, width: 44, top: 14, height: 240 };
const BOTTOM = TUBE.top + TUBE.height;

export function RainGauge({ rainfall, markers }: { rainfall: number; markers: GaugeMarker[] }) {
  const clipId = `gauge-${useId().replace(/:/g, "")}`;
  const scale = gaugeScale(rainfall, markers.map((m) => m.required));
  const toY = (value: number) => BOTTOM - (Math.min(value, scale) / scale) * TUBE.height;
  const fillHeight = Math.max(0, BOTTOM - toY(rainfall));
  const markerYs = markers.map((m) => toY(m.required));
  const labelYs = spreadLabels(markerYs, 17, TUBE.top + 8, BOTTOM - 2);
  const summary = [
    `Rain gauge: ${formatMm(rainfall)} millimetres in the last 30 days.`,
    ...markers.map((m) => `${cropLabel(m.crop)} needs ${formatMm(m.required)} millimetres.`),
  ].join(" ");

  return (
    <svg viewBox="0 0 208 270" role="img" aria-label={summary} className="h-auto w-[11.5rem] max-w-full shrink-0 sm:w-[15rem]">
      <defs>
        <clipPath id={clipId}>
          <rect x={TUBE.x} y={TUBE.top} width={TUBE.width} height={TUBE.height} rx={22} />
        </clipPath>
      </defs>

      <rect x={TUBE.x} y={TUBE.top} width={TUBE.width} height={TUBE.height} rx={22} fill="var(--color-rain-soft)" opacity={0.5} />

      <g clipPath={`url(#${clipId})`}>
        <g className="origin-bottom animate-fill-up [transform-box:fill-box]">
          <rect x={TUBE.x} y={BOTTOM - fillHeight} width={TUBE.width} height={fillHeight} fill="var(--color-rain)" />
          <rect x={TUBE.x} y={BOTTOM - fillHeight} width={TUBE.width} height={5} fill="#8fbbe0" />
        </g>
        <rect x={TUBE.x + 7} y={TUBE.top + 10} width={4} height={TUBE.height - 20} rx={2} fill="#ffffff" opacity={0.35} />
      </g>

      {tickValues(scale).map((value) => (
        <g key={value}>
          <line x1={TUBE.x} x2={TUBE.x + 9} y1={toY(value)} y2={toY(value)} stroke="var(--color-ink)" strokeWidth={1.5} opacity={0.55} />
          <text x={TUBE.x - 8} y={toY(value) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">
            {value}
          </text>
        </g>
      ))}

      <rect x={TUBE.x} y={TUBE.top} width={TUBE.width} height={TUBE.height} rx={22} fill="none" stroke="var(--color-ink)" strokeWidth={2} opacity={0.7} />

      {markers.map((marker, index) => (
        <g key={marker.crop}>
          <line x1={TUBE.x + TUBE.width - 8} x2={TUBE.x + TUBE.width + 10} y1={markerYs[index]} y2={markerYs[index]} stroke="var(--color-ink)" strokeWidth={2.5} />
          <line x1={TUBE.x + TUBE.width + 10} x2={TUBE.x + TUBE.width + 15} y1={markerYs[index]} y2={labelYs[index]} stroke="var(--color-ink)" strokeWidth={1} opacity={0.6} />
          <text x={TUBE.x + TUBE.width + 19} y={labelYs[index] + 4.5} fontSize={13} fontWeight={700} fill="var(--color-ink)">
            {cropLabel(marker.crop)} {formatMm(marker.required)}
          </text>
        </g>
      ))}

      <text x={TUBE.x + TUBE.width / 2} y={BOTTOM + 15} textAnchor="middle" fontSize={12} fill="var(--color-muted)">
        mm
      </text>
    </svg>
  );
}
