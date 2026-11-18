import { Sprout } from "lucide-react";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const icon = size === "lg" ? "size-7" : "size-6";
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden className={`grid place-items-center bg-leaf-deep text-maize ${box}`}>
        <Sprout className={icon} strokeWidth={2.25} />
      </span>
      <span className="font-display text-xl font-semibold leading-none tracking-tight">Farmer Advisor</span>
    </span>
  );
}
