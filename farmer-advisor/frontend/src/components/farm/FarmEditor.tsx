"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locate, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { CROPS, cropLabel } from "@/lib/crops";
import { isInUganda, type Place } from "@/lib/geo";
import type { Profile, ProfileInput, ReadingLevel } from "@/lib/types";
import { FarmMap } from "./FarmMap";
import { PlaceSearch } from "./PlaceSearch";

const LEVELS: { value: ReadingLevel; title: string; text: string }[] = [
  { value: "simple", title: "Simple words", text: "Short sentences and everyday words." },
  { value: "detailed", title: "More detail", text: "Fuller explanations and reasons." },
];

function parseAcres(value: string): { value: number | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) return { value: null, error: null };
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number <= 0 || number > 10000) {
    return { value: null, error: "Enter a size between 0 and 10,000 acres." };
  }
  return { value: number, error: null };
}

export function FarmEditor({ profile, welcome }: { profile: Profile; welcome: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [position, setPosition] = useState<[number, number] | null>(
    profile.latitude !== null && profile.longitude !== null ? [profile.latitude, profile.longitude] : null,
  );
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [placeName, setPlaceName] = useState(profile.location_name ?? "");
  const [acres, setAcres] = useState(profile.farm_size_acres !== null ? String(profile.farm_size_acres) : "");
  const [crops, setCrops] = useState<string[]>(profile.crops);
  const [customCrop, setCustomCrop] = useState("");
  const [level, setLevel] = useState<ReadingLevel>(profile.reading_level);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(profile);

  const acresCheck = parseAcres(acres);
  const outside = position !== null && !isInUganda(position[0], position[1]);

  function choose(latitude: number, longitude: number, fly = false) {
    const rounded: [number, number] = [Number(latitude.toFixed(5)), Number(longitude.toFixed(5))];
    setPosition(rounded);
    if (fly) setFlyTo(rounded);
    setLocationError(isInUganda(rounded[0], rounded[1]) ? null : "That spot is outside Uganda. Move the pin onto your farm.");
  }

  function onPlace(place: Place) {
    choose(place.latitude, place.longitude, true);
    if (!placeName.trim()) setPlaceName(place.name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("This phone cannot share its location. Search for a place or tap the map.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        choose(result.coords.latitude, result.coords.longitude, true);
        setLocating(false);
      },
      () => {
        setLocationError("We could not get your location. Allow location access, or search for a place.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function applyManual() {
    const latitude = Number(manualLat);
    const longitude = Number(manualLon);
    if (!manualLat.trim() || !manualLon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationError("Enter latitude and longitude as numbers, for example 0.3476 and 32.5825.");
      return;
    }
    choose(latitude, longitude, true);
  }

  function toggleCrop(key: string) {
    setCrops((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function addCustomCrop() {
    const name = customCrop.trim().toLowerCase();
    if (!name) return;
    setCrops((current) => (current.includes(name) ? current : [...current, name]));
    setCustomCrop("");
  }

  const dirty =
    position?.[0] !== saved.latitude ||
    position?.[1] !== saved.longitude ||
    placeName.trim() !== (saved.location_name ?? "") ||
    (acresCheck.value ?? null) !== saved.farm_size_acres ||
    level !== saved.reading_level ||
    crops.length !== saved.crops.length ||
    crops.some((crop) => !saved.crops.includes(crop));

  const canSave = !outside && !acresCheck.error && !saving && (dirty || welcome);

  async function save() {
    const input: ProfileInput = { crops, reading_level: level };
    if (position) {
      input.latitude = position[0];
      input.longitude = position[1];
    }
    if (placeName.trim()) input.location_name = placeName.trim();
    if (acresCheck.value !== null) input.farm_size_acres = acresCheck.value;

    setSaving(true);
    try {
      const next = await api.saveProfile(input);
      setSaved(next);
      toast("Your farm is saved.");
      if (welcome) router.replace("/today");
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Could not save your farm. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  const customCrops = crops.filter((crop) => !CROPS.some((known) => known.key === crop));

  return (
    <div>
      {welcome ? (
        <section className="mb-8 rounded-2xl bg-leaf-deep p-5 text-white md:p-6">
          <h2 className="font-display text-2xl font-semibold text-maize">Welcome. Let us find your farm.</h2>
          <p className="mt-1 text-white/90">
            Mark where your farm is and tick the crops you grow. Then Today will show the rain, the forecast and whether it suits planting.
          </p>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="where-heading" className="space-y-4">
          <h2 id="where-heading" className="font-display text-xl font-semibold">
            Where is your farm?
          </h2>
          <PlaceSearch onSelect={onPlace} />
          <Button variant="secondary" onClick={useMyLocation} loading={locating} icon={<Locate aria-hidden className="size-5" />}>
            Use my location
          </Button>

          <div className="h-80 overflow-hidden rounded-2xl border border-line md:h-[26rem]">
            <FarmMap position={position} flyTo={flyTo} onPick={(lat, lon) => choose(lat, lon)} />
          </div>

          <p role="status" className="text-muted">
            {position
              ? `Pin is at ${position[0]}, ${position[1]}. Drag it or tap the map to move it.`
              : "Tap the map to place a pin on your farm."}
          </p>
          {locationError ? (
            <p role="alert" className="font-semibold text-cherry">
              {locationError}
            </p>
          ) : null}

          <details className="rounded-2xl border border-line bg-surface px-4 py-3">
            <summary className="min-h-8 cursor-pointer font-semibold">Enter coordinates yourself</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <TextField label="Latitude" inputMode="decimal" value={manualLat} onChange={(event) => setManualLat(event.target.value)} />
              <TextField label="Longitude" inputMode="decimal" value={manualLon} onChange={(event) => setManualLon(event.target.value)} />
              <Button variant="secondary" onClick={applyManual}>
                Set pin
              </Button>
            </div>
          </details>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="about-heading" className="space-y-4">
            <h2 id="about-heading" className="font-display text-xl font-semibold">
              About your farm
            </h2>
            <TextField
              label="Village or town"
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              maxLength={120}
              hint="For example Wakiso or Gulu"
            />
            <TextField
              label="Farm size in acres"
              inputMode="decimal"
              value={acres}
              onChange={(event) => setAcres(event.target.value)}
              error={acresCheck.error}
              hint="Optional"
            />

            <fieldset>
              <legend className="mb-2 font-semibold">Crops you grow</legend>
              <ul className="flex flex-wrap gap-2">
                {CROPS.map((crop) => {
                  const on = crops.includes(crop.key);
                  return (
                    <li key={crop.key}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCrop(crop.key)}
                        className={`min-h-12 rounded-full border px-5 font-semibold ${
                          on ? "border-leaf bg-leaf text-white" : "border-line bg-surface hover:bg-leaf-soft"
                        }`}
                      >
                        {crop.label}
                      </button>
                    </li>
                  );
                })}
                {customCrops.map((crop) => (
                  <li key={crop}>
                    <button
                      type="button"
                      aria-pressed
                      onClick={() => toggleCrop(crop)}
                      aria-label={`${cropLabel(crop)}, tap to remove`}
                      className="min-h-12 rounded-full border border-leaf bg-leaf px-5 font-semibold text-white"
                    >
                      {cropLabel(crop)}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <label htmlFor="custom-crop" className="sr-only">
                    Another crop
                  </label>
                  <input
                    id="custom-crop"
                    value={customCrop}
                    onChange={(event) => setCustomCrop(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomCrop();
                      }
                    }}
                    maxLength={40}
                    placeholder="Another crop"
                    className="min-h-12 w-full rounded-xl border border-line bg-surface px-4 placeholder:text-muted/70"
                  />
                </div>
                <Button variant="secondary" onClick={addCustomCrop} disabled={!customCrop.trim()} icon={<Plus aria-hidden className="size-5" />}>
                  Add
                </Button>
              </div>
            </fieldset>
          </section>

          <fieldset aria-labelledby="level-heading" className="space-y-3">
            <legend id="level-heading" className="font-display text-xl font-semibold">
              How should I explain things?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-16 cursor-pointer flex-col justify-center rounded-2xl border px-4 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-rain ${
                    level === option.value ? "border-leaf bg-leaf-soft" : "border-line bg-surface hover:bg-leaf-soft/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="reading-level"
                    value={option.value}
                    checked={level === option.value}
                    onChange={() => setLevel(option.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{option.title}</span>
                  <span className="text-sm text-muted">{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button size="lg" onClick={save} loading={saving} disabled={!canSave} className="w-full sm:w-auto">
          Save my farm
        </Button>
      </div>
    </div>
  );
}
