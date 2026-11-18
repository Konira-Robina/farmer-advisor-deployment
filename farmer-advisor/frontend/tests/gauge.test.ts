import { describe, expect, it } from "vitest";
import { gaugeScale, needFraction, spreadLabels, tickValues } from "@/lib/gauge";

describe("gaugeScale", () => {
  it("has a minimum scale of 100", () => {
    expect(gaugeScale(10, [])).toBe(100);
  });

  it("leaves headroom above the highest value in steps of 50", () => {
    expect(gaugeScale(96.4, [80, 60])).toBe(150);
    expect(gaugeScale(140, [])).toBe(200);
    expect(gaugeScale(60, [300])).toBe(350);
  });
});

describe("tickValues", () => {
  it("uses finer ticks on small scales", () => {
    expect(tickValues(100)).toEqual([0, 25, 50, 75, 100]);
    expect(tickValues(200)).toEqual([0, 50, 100, 150, 200]);
  });
});

describe("spreadLabels", () => {
  it("keeps well-spaced labels where they are", () => {
    expect(spreadLabels([20, 80, 140], 17, 0, 300)).toEqual([20, 80, 140]);
  });

  it("pushes crowded labels apart in order", () => {
    const placed = spreadLabels([100, 104, 108], 17, 0, 300);
    expect(placed[1] - placed[0]).toBeGreaterThanOrEqual(17);
    expect(placed[2] - placed[1]).toBeGreaterThanOrEqual(17);
  });

  it("returns positions in the original order", () => {
    const placed = spreadLabels([200, 50], 17, 0, 300);
    expect(placed).toEqual([200, 50]);
  });

  it("stays inside the bottom limit", () => {
    const placed = spreadLabels([240, 244, 248], 17, 0, 250);
    expect(Math.max(...placed)).toBeLessThanOrEqual(250);
    expect(placed[1] - placed[0]).toBeGreaterThanOrEqual(17);
  });
});

describe("needFraction", () => {
  it("is capped between 0 and 1", () => {
    expect(needFraction(40, 80)).toBe(0.5);
    expect(needFraction(120, 80)).toBe(1);
    expect(needFraction(-5, 80)).toBe(0);
    expect(needFraction(10, 0)).toBe(1);
  });
});
