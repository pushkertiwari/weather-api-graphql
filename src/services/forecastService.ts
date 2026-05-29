import { GeocodingService } from "./geocodingService";
import { WeatherService } from "./weatherService";
import { ActivityRankingService } from "./activityRankingService";
import { WeatherForecastDto, CityDto } from "../types";

/**
 * ForecastService
 * Orchestrator / use-case layer.
 * Composes geocoding + weather + activity ranking into a single response.
 * Does not contain business logic — delegates to specialist services.
 */
export class ForecastService {
  constructor(
    private readonly geocodingService: GeocodingService,
    private readonly weatherService: WeatherService,
    private readonly activityRankingService: ActivityRankingService
  ) {}

async getWeatherForecast(cityId: string): Promise<WeatherForecastDto> {
  const city = this.geocodingService.getCityById(cityId); // no await
  if (!city) {
    throw new Error(`City not found for id: ${cityId}`);
  }
  return this.buildForecast(city);
}

  async getWeatherForecastByCoords(
    latitude: number,
    longitude: number,
    cityName = "Custom Location"
  ): Promise<WeatherForecastDto> {
    const city: CityDto = {
      id: `${latitude},${longitude}`,
      name: cityName,
      country: "",
      countryCode: "",
      latitude,
      longitude,
      timezone: "auto",
    };
    return this.buildForecast(city);
  }

  private async buildForecast(city: CityDto): Promise<WeatherForecastDto> {
    const summary = await this.weatherService.getWeatherSummary(
      city.latitude,
      city.longitude
    );

    const activityRankings =
      this.activityRankingService.rankActivities(summary);

    return {
      cityId: city.id,
      cityName: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      summary,
      activityRankings,
    };
  }
}
