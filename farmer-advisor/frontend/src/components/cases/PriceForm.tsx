"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField, inputClasses } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { CROPS } from "@/lib/crops";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PriceForm() {
  const toast = useToast();
  const [crop, setCrop] = useState<string>(CROPS[0].key);
  const [market, setMarket] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(today());
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(price);
    if (!market.trim() || !Number.isFinite(amount) || amount < 0 || price.trim() === "") {
      setError("Enter the market and a price in shillings per kilogram.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.addPrice({
        crop,
        market: market.trim(),
        price_ugx_per_kg: amount,
        recorded_on: date,
        source: source.trim() || undefined,
      });
      toast("Price saved.");
      setPrice("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save the price.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label htmlFor="price-crop" className="mb-1.5 block font-semibold">
          Crop
        </label>
        <select id="price-crop" value={crop} onChange={(event) => setCrop(event.target.value)} className={inputClasses}>
          {CROPS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Market" value={market} onChange={(event) => setMarket(event.target.value)} hint="For example Owino, Kampala" />
      <TextField
        label="Price in UGX per kg"
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
      />
      <TextField label="Date recorded" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <TextField
        className="sm:col-span-2"
        label="Source"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        hint="Optional. Where the price came from."
      />
      {error ? (
        <p role="alert" className="font-semibold text-cherry sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" loading={saving}>
          Save price
        </Button>
      </div>
    </form>
  );
}
