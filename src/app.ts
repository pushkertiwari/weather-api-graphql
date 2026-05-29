import express, { Application } from "express";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServer } from "@apollo/server";
import { GeocodingService } from "./services/geocodingService";
import { WeatherService } from "./services/weatherService";
import { ActivityRankingService } from "./services/activityRankingService";
import { ForecastService } from "./services/forecastService";
import { ResolverContext } from "./graphql/resolvers";

/**
 * createApp
 *
 * Wires together Express + Apollo middleware.
 * Accepts an already-started ApolloServer so integration tests can
 * pass a test server without hitting real external APIs.
 */
export async function createApp(
  apolloServer: ApolloServer<ResolverContext>
): Promise<Application> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health-check endpoint (useful for load-balancers / k8s probes)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── Dependency injection ────────────────────────────────────────────────
  // Services are constructed once per process and shared via Apollo context.
  // Swap real implementations with mocks in tests by providing a test server.

  const geocodingService = new GeocodingService();
  const weatherService = new WeatherService();
  const activityRankingService = new ActivityRankingService();
  const forecastService = new ForecastService(
    geocodingService,
    weatherService,
    activityRankingService
  );

  const middleware = expressMiddleware(apolloServer, {
    context: async (): Promise<ResolverContext> => ({
      geocodingService,
      forecastService,
    }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use("/graphql", middleware as any);

  return app;
}
