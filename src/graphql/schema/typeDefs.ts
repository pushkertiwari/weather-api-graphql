import { gql } from "graphql-tag";

/**
 * GraphQL Schema
 *
 * Design decisions:
 * - City and WeatherForecast are separate types so clients can query
 *   autocomplete independently from weather (different UX steps).
 * - ActivityRanking is a first-class type (not a scalar map) so clients
 *   can select only the fields they need.
 * - Enums are used for ActivityType and RecommendationLevel to give
 *   consumers a contract they can depend on.
 * - score (0–100 Int) + recommendation enum avoids leaking raw floats
 *   and gives consumers both a machine-readable value and a human label.
 */
export const typeDefs = gql`
  # ─── Enums ────────────────────────────────────────────────────────────────

  """
  The four supported activities, ranked by weather suitability.
  """
  enum ActivityType {
    SKIING
    SURFING
    INDOOR_SIGHTSEEING
    OUTDOOR_SIGHTSEEING
  }

  """
  Human-readable recommendation label derived from the numeric score.
  """
  enum RecommendationLevel {
    GREAT
    GOOD
    FAIR
    POOR
  }

  # ─── Core Types ───────────────────────────────────────────────────────────

  """
  A city result from the geocoding search.
  """
  type City {
    "Stable numeric ID from the Open-Meteo geocoding database."
    id: ID!
    name: String!
    country: String!
    countryCode: String!
    "State, province, or region (may be null for small countries)."
    region: String
    latitude: Float!
    longitude: Float!
    timezone: String!
  }

  """
  Aggregated 24-hour weather summary for a city.
  """
  type WeatherSummary {
    "Average temperature in °C."
    temperature: Float!
    "Total precipitation in mm."
    precipitation: Float!
    "Average wind speed in km/h."
    windspeed: Float!
    "Total snowfall in cm."
    snowfall: Float!
    "Average visibility in km."
    visibility: Float!
    "WMO weather interpretation code (mid-day reading)."
    weatherCode: Int!
  }

  """
  Scored suitability of a single activity given current weather.
  """
  type ActivityRanking {
    activity: ActivityType!
    "Suitability score from 0 (worst) to 100 (best)."
    score: Int!
    recommendation: RecommendationLevel!
    "Human-readable explanation of the score."
    reason: String!
  }

  """
  Full weather forecast for a city including activity rankings.
  """
  type WeatherForecast {
    cityId: ID!
    cityName: String!
    latitude: Float!
    longitude: Float!
    timezone: String!
    summary: WeatherSummary!
    "Activities sorted from most to least suitable."
    activityRankings: [ActivityRanking!]!
  }

  # ─── Root ─────────────────────────────────────────────────────────────────

  type Query {
    """
    Return city suggestions matching a partial or complete city name.
    Backed by Open-Meteo Geocoding API.
    """
    citySuggestions(
      "Minimum 2 characters. Case-insensitive."
      query: String!
      "Maximum number of results to return (1–10)."
      limit: Int = 5
    ): [City!]!

    """
    Return a 24-hour weather forecast and activity rankings for a city.
    Use a city ID obtained from citySuggestions.
    """
    weatherForecast(cityId: ID!): WeatherForecast!
  }
`;
