import { describe, expect, it } from "vitest";
import { isInUganda, toPlace } from "@/lib/geo";

describe("isInUganda", () => {
  it("accepts places in Uganda", () => {
    expect(isInUganda(0.3476, 32.5825)).toBe(true);
    expect(isInUganda(2.77, 32.3)).toBe(true);
  });

  it("rejects places outside Uganda", () => {
    expect(isInUganda(51.5, -0.12)).toBe(false);
    expect(isInUganda(-1.29, 36.82)).toBe(false);
    expect(isInUganda(0.3, 40)).toBe(false);
  });
});

describe("toPlace", () => {
  it("parses a search result", () => {
    const place = toPlace({ place_id: 42, display_name: "Wakiso, Wakiso District, Central Region, Uganda", lat: "0.4", lon: "32.46" });
    expect(place).toEqual({
      id: "42",
      name: "Wakiso",
      detail: "Wakiso District, Central Region",
      latitude: 0.4,
      longitude: 32.46,
    });
  });

  it("drops results with bad coordinates", () => {
    expect(toPlace({ place_id: 1, display_name: "Nowhere", lat: "x", lon: "32" })).toBeNull();
  });
});
