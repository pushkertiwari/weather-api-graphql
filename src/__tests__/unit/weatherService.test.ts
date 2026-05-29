import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { WeatherService } from "../../services/weatherService";

describe("WeatherService", () => {
  let mock: MockAdapter;
  let service: WeatherService;

  beforeEach(() => {
    const client = axios.create({ baseURL: "https://api.open-meteo.com/v1" });
    mock = new MockAdapter(client);
    service = new WeatherService(client);
  });

  afterEach(() => mock.restore());

  const mockResponse = {
    latitude: 51.5,
    longitude: -0.12,
    timezone: "Europe/London",
    hourly: {
      time: ["2024-01-01T00:00", "2024-01-01T01:00", "2024-01-01T02:00"],
      temperature_2m: [10, 12, 11],
      precipitation: [0, 0.5, 0.2],
      windspeed_10m: [15, 18, 16],
      snowfall: [0, 0, 0],
      weathercode: [3, 61, 61],
      visibility: [10000, 8000, 9000],
    },
  };

  it("returns a correct WeatherSummaryDto", async () => {
    mock.onGet("/forecast").reply(200, mockResponse);

    const summary = await service.getWeatherSummary(51.5, -0.12);

    expect(summary.temperature).toBeCloseTo(11, 0);
    expect(summary.precipitation).toBeCloseTo(0.7, 1);
    expect(summary.windspeed).toBeCloseTo(16.33, 0);
    expect(summary.snowfall).toBe(0);
    // Visibility converted from m to km: avg(10000+8000+9000)/3 / 1000 = 9
    expect(summary.visibility).toBeCloseTo(9, 0);
  });

  it("throws on HTTP error", async () => {
    mock.onGet("/forecast").reply(500);

    await expect(service.getWeatherSummary(0, 0)).rejects.toThrow();
  });

  it("handles single-entry arrays gracefully", async () => {
    mock.onGet("/forecast").reply(200, {
      ...mockResponse,
      hourly: {
        ...mockResponse.hourly,
        temperature_2m: [5],
        precipitation: [0],
        windspeed_10m: [10],
        snowfall: [0],
        weathercode: [0],
        visibility: [5000],
      },
    });

    const summary = await service.getWeatherSummary(0, 0);
    expect(summary.temperature).toBe(5);
    expect(summary.visibility).toBe(5);
  });
});
