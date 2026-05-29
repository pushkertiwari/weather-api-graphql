// ─── Geocoding ───────────────────────────────────────────────────────────────

export interface GeocodingResult {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string; // state/region
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface GeocodingApiResponse {
  results?: GeocodingResult[];
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface HourlyWeatherData {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  windspeed_10m: number[];
  snowfall: number[];
  weathercode: number[];
  visibility: number[];
}

export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: HourlyWeatherData;
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface CityDto {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherSummaryDto {
  temperature: number;       // avg °C
  precipitation: number;     // total mm
  windspeed: number;         // avg km/h
  snowfall: number;          // total cm
  visibility: number;        // avg km
  weatherCode: number;
}

export interface ActivityRankingDto {
  activity: ActivityType;
  score: number;             // 0–100
  recommendation: RecommendationLevel;
  reason: string;
}

export interface WeatherForecastDto {
  cityId: string;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  summary: WeatherSummaryDto;
  activityRankings: ActivityRankingDto[];
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ActivityType =
  | "SKIING"
  | "SURFING"
  | "INDOOR_SIGHTSEEING"
  | "OUTDOOR_SIGHTSEEING";

export type RecommendationLevel = "GREAT" | "GOOD" | "FAIR" | "POOR";
