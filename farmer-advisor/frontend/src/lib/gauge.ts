export function gaugeScale(rainfall: number, requirements: number[]): number {
  const highest = Math.max(rainfall, ...requirements, 0);
  const padded = highest * 1.15;
  return Math.max(100, Math.ceil(padded / 50) * 50);
}

export function tickValues(scale: number): number[] {
  const step = scale <= 150 ? 25 : 50;
  const ticks: number[] = [];
  for (let value = 0; value <= scale; value += step) ticks.push(value);
  return ticks;
}

export function spreadLabels(positions: number[], gap: number, min: number, max: number): number[] {
  const order = positions.map((position, index) => ({ position, index })).sort((a, b) => a.position - b.position);
  const placed: number[] = new Array(positions.length);
  let previous = -Infinity;
  for (const item of order) {
    const next = Math.max(item.position, previous + gap, min);
    placed[item.index] = next;
    previous = next;
  }
  const overflow = previous - max;
  if (overflow > 0) {
    for (let i = order.length - 1, limit = max; i >= 0; i--) {
      const index = order[i].index;
      placed[index] = Math.min(placed[index], limit);
      limit = placed[index] - gap;
    }
  }
  return placed;
}

export function needFraction(rainfall: number, required: number): number {
  if (required <= 0) return 1;
  return Math.min(1, Math.max(0, rainfall / required));
}
