import { describe, expect, it } from "vitest";
import {
  dayGroupLabel,
  formatDateTime,
  formatHarvestWindow,
  formatMm,
  formatShortDate,
  formatWeekday,
  greeting,
  groupThreads,
} from "@/lib/format";

describe("dates", () => {
  it("formats short dates and weekdays without timezone drift", () => {
    expect(formatShortDate("2027-03-05")).toBe("5 Mar");
    expect(formatShortDate("2027-03-05T23:59:00Z")).toBe("5 Mar");
    expect(formatWeekday("2026-11-15")).toBe("Sun");
  });

  it("formats a harvest window", () => {
    expect(formatHarvestWindow({ from: "2027-03-05", to: "2027-03-19" })).toBe("5 Mar to 19 Mar");
  });

  it("formats date and time", () => {
    expect(formatDateTime(new Date(2026, 10, 15, 9, 5).toISOString())).toBe("15 Nov, 09:05");
  });

  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 0, 1, 13))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 0, 1, 19))).toBe("Good evening");
  });
});

describe("formatMm", () => {
  it("keeps whole numbers clean and rounds decimals to one place", () => {
    expect(formatMm(80)).toBe("80");
    expect(formatMm(96.44)).toBe("96.4");
    expect(formatMm(0)).toBe("0");
  });
});

describe("thread grouping", () => {
  const now = new Date(2026, 10, 15, 12);
  const at = (daysAgo: number) => new Date(2026, 10, 15 - daysAgo, 9).toISOString();

  it("labels days", () => {
    expect(dayGroupLabel(at(0), now)).toBe("Today");
    expect(dayGroupLabel(at(1), now)).toBe("Yesterday");
    expect(dayGroupLabel(at(5), now)).toBe("Last 7 days");
    expect(dayGroupLabel(at(30), now)).toBe("Older");
  });

  it("groups consecutive threads and keeps order", () => {
    const threads = [
      { id: "a", title: "A", created_at: at(0) },
      { id: "b", title: "B", created_at: at(0) },
      { id: "c", title: "C", created_at: at(1) },
      { id: "d", title: "D", created_at: at(40) },
    ];
    const groups = groupThreads(threads, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Older"]);
    expect(groups[0].items.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
