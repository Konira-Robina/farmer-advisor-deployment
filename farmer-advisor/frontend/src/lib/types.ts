export type Role = "farmer" | "extension_officer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

export type ReadingLevel = "simple" | "detailed";

export interface Profile {
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  farm_size_acres: number | null;
  crops: string[];
  language: string;
  reading_level: ReadingLevel;
}

export interface ProfileInput {
  location_name?: string;
  latitude?: number;
  longitude?: number;
  farm_size_acres?: number;
  crops?: string[];
  reading_level?: ReadingLevel;
}

export interface AppConfig {
  max_images: number;
  max_image_mb: number;
  vision_enabled: boolean;
  max_message_chars: number;
}

export interface ChatImage {
  id: string;
  url: string;
}

export interface ServerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  rating: number | null;
  images: ChatImage[];
}

export interface Thread {
  id: string;
  title: string | null;
  created_at: string;
}

export interface ChatReply {
  thread_id: string;
  message_id: string;
  reply: string;
  escalated: boolean;
  usage: { input_tokens: number; output_tokens: number; cost_usd: number | null };
}

export type PlantingStatus = "favourable" | "prepare_land_and_monitor" | "wait" | "insufficient_data";

export interface CropAdvice {
  crop: string;
  status: PlantingStatus;
  explanation: string;
  notes?: string[];
  rainfall_last_30_days_mm?: number;
  rainfall_next_7_days_mm?: number;
  required_rainfall_30_days_mm?: number;
  expected_harvest_window?: { from: string; to: string } | null;
  days_to_maturity?: number;
  ideal_soil_ph?: [number, number] | null;
  threshold_source?: string | null;
}

export interface Weather {
  latitude: number;
  longitude: number;
  current: { temperature_c: number; humidity_percent: number };
  rainfall_last_30_days_mm: number;
  rainfall_next_7_days_mm: number;
  daily_forecast: { date: string; rain_mm: number }[];
}

export interface FarmOverview {
  has_location: boolean;
  location_name: string | null;
  has_crops: boolean;
  weather: Weather | null;
  weather_error: string | null;
  crops: CropAdvice[];
  unsupported_crops: string[];
}

export type EscalationStatus = "open" | "reviewed" | "closed";

export interface Escalation {
  id: string;
  thread_id: string;
  reason: string;
  status: EscalationStatus;
  created_at: string;
  farmer_email: string;
  farmer_name: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PriceInput {
  crop: string;
  market: string;
  price_ugx_per_kg: number;
  recorded_on: string;
  source?: string;
}
