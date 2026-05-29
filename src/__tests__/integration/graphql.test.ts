import request from "supertest";
import { Application } from "express";
import { ApolloServer } from "@apollo/server";
import { createApolloServer } from "../../graphql/server";
import { createApp } from "../../app";
import { GeocodingService } from "../../services/geocodingService";
import { ForecastService } from "../../services/forecastService";
import { WeatherService } from "../../services/weatherService";
import { ActivityRankingService } from "../../services/activityRankingService";
import { ResolverContext } from "../../graphql/resolvers";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";

// ─── Mock services ────────────────────────────────────────────────────────────

const mockCity = {
  id: "2643743",
  name: "London",
  country: "United Kingdom",
  countryCode: "GB",
  region: "England",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
};

const mockForecast = {
  cityId: "2643743",
  cityName: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: "Europe/London",
  summary: {
    temperature: 12,
    precipitation: 2.5,
    windspeed: 18,
    snowfall: 0,
    visibility: 9,
    weatherCode: 61,
  },
  activityRankings: [
    {
      activity: "INDOOR_SIGHTSEEING",
      score: 70,
      recommendation: "GOOD",
      reason: "rainy day – great for museums",
    },
    {
      activity: "OUTDOOR_SIGHTSEEING",
      score: 40,
      recommendation: "FAIR",
      reason: "light rain",
    },
    {
      activity: "SURFING",
      score: 30,
      recommendation: "FAIR",
      reason: "mild temps",
    },
    {
      activity: "SKIING",
      score: 5,
      recommendation: "POOR",
      reason: "too warm",
    },
  ],
};

// ─── Test app setup ───────────────────────────────────────────────────────────

async function buildTestApp(): Promise<{
  app: Application;
  server: ApolloServer<ResolverContext>;
}> {
  const geocodingService = {
    getCitySuggestions: jest.fn().mockResolvedValue([mockCity]),
    getCityById: jest.fn().mockResolvedValue(mockCity),
  } as unknown as GeocodingService;

  const forecastService = {
    getWeatherForecast: jest.fn().mockResolvedValue(mockForecast),
  } as unknown as ForecastService;

  const apolloServer = createApolloServer();
  await apolloServer.start();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use("/graphql", expressMiddleware(apolloServer, {
    context: async (): Promise<ResolverContext> => ({
      geocodingService,
      forecastService,
    }),
  }) as any);

  return { app, server: apolloServer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GraphQL API – Integration", () => {
  let app: Application;
  let server: ApolloServer<ResolverContext>;

  beforeAll(async () => {
    const result = await buildTestApp();
    app = result.app;
    server = result.server;
  });

  afterAll(async () => {
    await server.stop();
  });

  // ─── Health ────────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns 200 with ok status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  // ─── citySuggestions ──────────────────────────────────────────────────

  describe("Query.citySuggestions", () => {
    const QUERY = `
      query CitySuggestions($query: String!) {
        citySuggestions(query: $query) {
          id
          name
          country
          countryCode
          region
          latitude
          longitude
          timezone
        }
      }
    `;

    it("returns city suggestions for a valid query", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { query: "London" } });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      const cities = res.body.data.citySuggestions;
      expect(cities).toHaveLength(1);
      expect(cities[0].name).toBe("London");
      expect(cities[0].id).toBe("2643743");
    });

    it("returns a BAD_USER_INPUT error for a 1-char query", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { query: "L" } });

      expect(res.status).toBe(200); // GraphQL always returns 200
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
    });

    it("returns a BAD_USER_INPUT error for an empty query", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { query: "" } });

      expect(res.status).toBe(200);
      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
    });
  });

  // ─── weatherForecast ──────────────────────────────────────────────────

  describe("Query.weatherForecast", () => {
    const QUERY = `
      query WeatherForecast($cityId: ID!) {
        weatherForecast(cityId: $cityId) {
          cityId
          cityName
          latitude
          longitude
          timezone
          summary {
            temperature
            precipitation
            windspeed
            snowfall
            visibility
            weatherCode
          }
          activityRankings {
            activity
            score
            recommendation
            reason
          }
        }
      }
    `;

    it("returns forecast with all fields for a valid cityId", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { cityId: "2643743" } });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();

      const forecast = res.body.data.weatherForecast;
      expect(forecast.cityName).toBe("London");
      expect(forecast.summary.temperature).toBe(12);
      expect(forecast.activityRankings).toHaveLength(4);
    });

    it("activityRankings contain all required fields", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { cityId: "2643743" } });

      const rankings = res.body.data.weatherForecast.activityRankings;
      rankings.forEach((r: Record<string, unknown>) => {
        expect(r).toHaveProperty("activity");
        expect(r).toHaveProperty("score");
        expect(r).toHaveProperty("recommendation");
        expect(r).toHaveProperty("reason");
      });
    });

    it("returns BAD_USER_INPUT for empty cityId", async () => {
      const res = await request(app)
        .post("/graphql")
        .send({ query: QUERY, variables: { cityId: "" } });

      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
    });
  });
});
