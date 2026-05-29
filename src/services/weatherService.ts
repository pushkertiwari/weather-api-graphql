import { AxiosInstance } from "axios";
import { config } from "../config/env";
import { createHttpClient, get } from "../utils/httpClient";
import { WeatherApiResponse, WeatherSummaryDto } from "../types";

const HOURLY_VARIABLES = [
  "temperature_2m",
  "precipitation",
  "windspeed_10m",
  "snowfall",
  "weathercode",
  "visibility",
].join(",");

/**
 * WeatherService
 * Wraps the Open-Meteo Forecast API.
 * Responsible ONLY for fetching raw weather data and converting it to a
 * summary DTO — no activity ranking logic lives here.
 */
export class WeatherService {
  private readonly client: AxiosInstance;

  constructor(client?: AxiosInstance) {
    this.client = client ?? createHttpClient(config.openMeteo.baseUrl);
  }

  /**
   * Fetch a 24-hour weather summary for a given coordinate pair.
   */
  async getWeatherSummary(
    latitude: number,
    longitude: number
  ): Promise<WeatherSummaryDto> {
    const response = await get<WeatherApiResponse>(this.client, "/forecast", {
      latitude,
      longitude,
      hourly: HOURLY_VARIABLES,
      forecast_days: 1,
      timezone: "auto",
    });

    return this.summarise(response);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private summarise(response: WeatherApiResponse): WeatherSummaryDto {
    const h = response.hourly;

    return {
      temperature: this.avg(h.temperature_2m),
      precipitation: this.sum(h.precipitation),
      windspeed: this.avg(h.windspeed_10m),
      snowfall: this.sum(h.snowfall),
      // Open-Meteo returns visibility in metres; convert to km
      visibility: this.avg(h.visibility) / 1000,
      // midday weather code is a simple heuristic for overall conditions; not perfect but works reasonably well for a 24h summary
      weatherCode: h.weathercode[Math.floor(h.weathercode.length / 2)] ?? 0,
    };
  }

  private avg(values: number[]): number {
    if (!values.length) return 0;
    const valid = values.filter((v) => v != null);
    return parseFloat(
      (valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(2)
    );
  }

  private sum(values: number[]): number {
    return parseFloat(values.reduce((s, v) => s + (v ?? 0), 0).toFixed(2));
  }
}
