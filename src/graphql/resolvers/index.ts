import { GraphQLError } from "graphql";
import { GeocodingService } from "../../services/geocodingService";
import { ForecastService } from "../../services/forecastService";

export interface ResolverContext {
  geocodingService: GeocodingService;
  forecastService: ForecastService;
}

/**
 * Resolvers
 *
 * Resolvers are intentionally thin:
 * - Input validation (throw GraphQLError with appropriate code)
 * - Delegate to service layer
 * - No business logic lives here
 *
 * This keeps resolvers easy to test in isolation via context injection.
 */
export const resolvers = {
  Query: {
    citySuggestions: async (
      _: unknown,
      args: { query: string; limit?: number },
      context: ResolverContext
    ) => {
      const { query, limit = 5 } = args;

      if (!query || query.trim().length < 2) {
        throw new GraphQLError("Query must be at least 2 characters.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const clampedLimit = Math.min(Math.max(limit, 1), 10);

      return context.geocodingService.getCitySuggestions(
        query.trim(),
        clampedLimit
      );
    },

    weatherForecast: async (
      _: unknown,
      args: { cityId: string },
      context: ResolverContext
    ) => {
      const { cityId } = args;

      if (!cityId || !cityId.trim()) {
        throw new GraphQLError("cityId is required.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        return await context.forecastService.getWeatherForecast(cityId.trim());
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          throw new GraphQLError(err.message, {
            extensions: { code: "NOT_FOUND" },
          });
        }
        throw err;
      }
    },
  },
};
