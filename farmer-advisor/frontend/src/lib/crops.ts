export const CROPS = [
  { key: "maize", label: "Maize" },
  { key: "beans", label: "Beans" },
  { key: "cassava", label: "Cassava" },
  { key: "coffee", label: "Coffee" },
  { key: "banana", label: "Bananas" },
] as const;

export function cropLabel(key: string): string {
  const known = CROPS.find((crop) => crop.key === key);
  if (known) return known.label;
  return key.charAt(0).toUpperCase() + key.slice(1);
}
