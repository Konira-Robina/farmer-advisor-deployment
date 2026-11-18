export const UGANDA_CENTER: [number, number] = [1.37, 32.29];
export const UGANDA_BOUNDS = { south: -1.6, north: 4.4, west: 29.4, east: 35.2 };

export function isInUganda(latitude: number, longitude: number): boolean {
  return (
    latitude >= UGANDA_BOUNDS.south &&
    latitude <= UGANDA_BOUNDS.north &&
    longitude >= UGANDA_BOUNDS.west &&
    longitude <= UGANDA_BOUNDS.east
  );
}

export interface Place {
  id: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
}

export function toPlace(result: NominatimResult): Place | null {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const parts = result.display_name.split(",").map((part) => part.trim());
  return {
    id: String(result.place_id),
    name: parts[0] ?? result.display_name,
    detail: parts.slice(1, 3).join(", "),
    latitude,
    longitude,
  };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ format: "jsonv2", countrycodes: "ug", limit: "6", q: query });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!response.ok) throw new Error("Place search failed");
  const results = (await response.json()) as NominatimResult[];
  return results
    .map(toPlace)
    .filter((place): place is Place => place !== null && isInUganda(place.latitude, place.longitude));
}
