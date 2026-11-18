import { CheckCircle2, CircleHelp, CloudRain, Hourglass } from "lucide-react";
import type { PlantingStatus } from "@/lib/types";

const META: Record<PlantingStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  favourable: { label: "Good time to plant", className: "bg-leaf-soft text-leaf-deep", Icon: CheckCircle2 },
  prepare_land_and_monitor: { label: "Prepare the land", className: "bg-maize-soft text-ink", Icon: Hourglass },
  wait: { label: "Wait for rain", className: "bg-rain-soft text-rain-deep", Icon: CloudRain },
  insufficient_data: { label: "Not enough data", className: "bg-line/60 text-muted", Icon: CircleHelp },
};

export function statusLabel(status: PlantingStatus): string {
  return META[status].label;
}

export function StatusPill({ status }: { status: PlantingStatus }) {
  const { label, className, Icon } = META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.95rem] font-semibold ${className}`}>
      <Icon aria-hidden className="size-4" />
      {label}
    </span>
  );
}
