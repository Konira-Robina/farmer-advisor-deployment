"use client";

import { useRef, useState, type FormEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/TextField";
import { searchPlaces, type Place } from "@/lib/geo";

export function PlaceSearch({ onSelect }: { onSelect: (place: Place) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchPlaces(text, current.signal));
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      setResults(null);
      setError("Search needs an internet connection. You can also tap the map.");
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="place-search" className="sr-only">
            Search for a village or town
          </label>
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a village or town"
            className={inputClasses}
            autoComplete="off"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!query.trim()} icon={<Search aria-hidden className="size-5" />}>
          Search
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-cherry">
          {error}
        </p>
      ) : null}

      {results && results.length === 0 ? (
        <p role="status" className="mt-2 text-muted">
          No places found in Uganda for “{query.trim()}”. Try the nearest town.
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(place);
                  setResults(null);
                  setQuery(place.name);
                }}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-leaf-soft"
              >
                <MapPin aria-hidden className="size-5 shrink-0 text-leaf" />
                <span className="min-w-0">
                  <span className="block font-semibold">{place.name}</span>
                  {place.detail ? <span className="block truncate text-sm text-muted">{place.detail}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
