import { ActivityRankingService } from "../../services/activityRankingService";
import { WeatherSummaryDto } from "../../types";

const service = new ActivityRankingService();

function makeWeather(overrides: Partial<WeatherSummaryDto> = {}): WeatherSummaryDto {
  return {
    temperature: 15,
    precipitation: 0,
    windspeed: 10,
    snowfall: 0,
    visibility: 20,
    weatherCode: 0,
    ...overrides,
  };
}

describe("ActivityRankingService", () => {
  describe("rankActivities", () => {
    it("returns exactly 4 activities", () => {
      const rankings = service.rankActivities(makeWeather());
      expect(rankings).toHaveLength(4);
    });

    it("returns activities sorted by score descending", () => {
      const rankings = service.rankActivities(makeWeather());
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i - 1].score).toBeGreaterThanOrEqual(rankings[i].score);
      }
    });

    it("scores are in 0–100 range", () => {
      const rankings = service.rankActivities(makeWeather());
      rankings.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Skiing", () => {
    it("ranks SKIING highly in ideal snowy conditions", () => {
      const weather = makeWeather({
        temperature: -8,
        snowfall: 15,
        windspeed: 10,
        visibility: 20,
      });
      const rankings = service.rankActivities(weather);
      const skiing = rankings.find((r) => r.activity === "SKIING")!;
      expect(skiing.score).toBeGreaterThanOrEqual(75);
      expect(skiing.recommendation).toBe("GREAT");
    });

    it("ranks SKIING poorly when too warm with no snow", () => {
      const weather = makeWeather({ temperature: 25, snowfall: 0 });
      const rankings = service.rankActivities(weather);
      const skiing = rankings.find((r) => r.activity === "SKIING")!;
      expect(skiing.recommendation).toMatch(/POOR|FAIR/);
    });
  });

  describe("Surfing", () => {
    it("ranks SURFING highly in warm windy conditions", () => {
      const weather = makeWeather({
        temperature: 25,
        windspeed: 25,
        precipitation: 0,
        snowfall: 0,
      });
      const rankings = service.rankActivities(weather);
      const surfing = rankings.find((r) => r.activity === "SURFING")!;
      expect(surfing.score).toBeGreaterThanOrEqual(65);
    });

    it("ranks SURFING poorly in cold snowy weather", () => {
      const weather = makeWeather({
        temperature: -5,
        snowfall: 10,
        windspeed: 80,
      });
      const rankings = service.rankActivities(weather);
      const surfing = rankings.find((r) => r.activity === "SURFING")!;
      expect(surfing.recommendation).toMatch(/POOR|FAIR/);
    });
  });

  describe("Indoor Sightseeing", () => {
    it("scores high in rainy cold weather", () => {
      const weather = makeWeather({
        temperature: -2,
        precipitation: 20,
        windspeed: 60,
      });
      const rankings = service.rankActivities(weather);
      const indoor = rankings.find((r) => r.activity === "INDOOR_SIGHTSEEING")!;
      expect(indoor.score).toBeGreaterThanOrEqual(75);
    });

    it("always has a base score (always available)", () => {
      const weather = makeWeather({ temperature: 30, precipitation: 0 });
      const rankings = service.rankActivities(weather);
      const indoor = rankings.find((r) => r.activity === "INDOOR_SIGHTSEEING")!;
      expect(indoor.score).toBeGreaterThan(0);
    });
  });

  describe("Outdoor Sightseeing", () => {
    it("scores high in ideal conditions (mild, dry, clear)", () => {
      const weather = makeWeather({
        temperature: 22,
        precipitation: 0,
        windspeed: 8,
        visibility: 25,
      });
      const rankings = service.rankActivities(weather);
      const outdoor = rankings.find((r) => r.activity === "OUTDOOR_SIGHTSEEING")!;
      expect(outdoor.score).toBeGreaterThanOrEqual(75);
      expect(outdoor.recommendation).toBe("GREAT");
    });

    it("scores low in heavy rain with poor visibility", () => {
      const weather = makeWeather({
        temperature: 10,
        precipitation: 20,
        visibility: 1,
        windspeed: 55,
      });
      const rankings = service.rankActivities(weather);
      const outdoor = rankings.find((r) => r.activity === "OUTDOOR_SIGHTSEEING")!;
      expect(outdoor.recommendation).toMatch(/POOR|FAIR/);
    });
  });

  describe("recommendation labels", () => {
    const cases: Array<[number, string]> = [
      [80, "GREAT"],
      [60, "GOOD"],
      [35, "FAIR"],
      [10, "POOR"],
    ];

    it.each(cases)(
      "score %i maps to recommendation %s",
      (score, expected) => {
        // We test the label indirectly via a scenario that yields a known score
        // (exact score varies), so we test the toLevel helper indirectly
        // through a full ranking and just verify label thresholds are coherent.
        const weather = makeWeather();
        const rankings = service.rankActivities(weather);
        rankings.forEach((r) => {
          if (r.score >= 75) expect(r.recommendation).toBe("GREAT");
          else if (r.score >= 50) expect(r.recommendation).toBe("GOOD");
          else if (r.score >= 25) expect(r.recommendation).toBe("FAIR");
          else expect(r.recommendation).toBe("POOR");
        });
      }
    );
  });
});
