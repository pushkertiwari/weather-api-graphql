import { AxiosInstance } from "axios";
import { config } from "../config/env";
import { createHttpClient, get } from "../utils/httpClient";
import { GeocodingApiResponse, CityDto, GeocodingResult } from "../types";

/**
 * GeocodingService
 * Wraps the Open-Meteo Geocoding API.
 * Responsible ONLY for city lookup — no weather logic here.
 */
export class GeocodingService {
  private readonly client: AxiosInstance;

  constructor(client?: AxiosInstance) {
    this.client = client ?? createHttpClient(config.openMeteo.geocodingUrl);
  }

  /**
   * Fetch city suggestions for a partial or full name query.
   * Returns up to `limit` results (default 5).
   */
  async getCitySuggestions(query: string, limit = 5): Promise<CityDto[]> {
    if (!query || query.trim().length < 2) return [];

    const response = await get<GeocodingApiResponse>(this.client, "/search", {
      name: query.trim(),
      count: limit,
      language: "en",
      format: "json",
    });

    return (response.results ?? []).map(this.toDto);
  }

  /**
   * Decodes a city from the encoded ID string (no network call).
   * The ID is produced by toDto and contains all data needed for weather lookup.
   *
   * Format: "<numericId>|<latitude>|<longitude>|<name>"
   * Example: "1264728|13.0878|80.2785|Chennai"
   */
  getCityById(id: string): CityDto | null {
    const parts = id.split("|");
    if (parts.length !== 4) return null;

    const [, lat, lon, name] = parts;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return {
      id,
      name,
      country: "",
      countryCode: "",
      latitude,
      longitude,
      timezone: "auto",
    };
  }

  /**
   * Encodes lat/lon/name into the ID so weatherForecast can resolve
   * coordinates without a second geocoding API call.
   */
  private toDto(result: GeocodingResult): CityDto {
    const encodedId = `${result.id}|${result.latitude}|${result.longitude}|${result.name}`;
    return {
      id: encodedId,
      name: result.name,
      country: result.country,
      countryCode: result.country_code,
      region: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };
  }
}