# ✈️ Travel Planning GraphQL API

A scalable, well-tested GraphQL API for travel planning — built with **Node.js**, **TypeScript**, **Express**, and **Apollo Server 4**.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [GraphQL Schema](#graphql-schema)
5. [External APIs](#external-apis)
6. [Activity Scoring Logic](#activity-scoring-logic)
7. [Testing](#testing)
8. [Omissions & Trade-offs](#omissions--trade-offs)
9. [Future Improvements](#future-improvements)
10. [AI Tool Usage](#ai-tool-usage)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env

# 3. Start development server (hot-reload)
npm run dev

# 4. Run tests
npm test

# 5. Build for production
npm run build && npm start
```

GraphQL Playground: `http://localhost:4000/graphql`  
Health check: `http://localhost:4000/health`

---

## Architecture Overview

The project follows a **layered architecture** with strict separation of concerns:

```
HTTP Layer (Express)
       │
 GraphQL Layer (Apollo Server 4)
       │ resolvers — thin, validation only
       │
 Service Layer (Use Cases)
   ├── GeocodingService   — city search & ID lookup
   ├── WeatherService     — weather fetching & aggregation
   ├── ActivityRanking    — pure scoring engine (no I/O)
   └── ForecastService    — orchestrator (composes the above)
       │
 Utility Layer
   └── httpClient.ts      — Axios factory with interceptors
```

### Why this structure?

| Layer | Responsibility | Why isolated? |
|---|---|---|
| **Resolvers** | Input validation + delegate | Keeps GraphQL concerns (error codes, field mapping) out of business logic |
| **GeocodingService** | City search via Open-Meteo Geocoding API | Single-responsibility; swappable for another geocoder |
| **WeatherService** | Fetch + aggregate 24-hour forecast | Aggregation logic is tested independently from scoring |
| **ActivityRankingService** | Produce 0–100 scores per activity | Pure function — zero I/O, trivially unit-testable |
| **ForecastService** | Orchestrate geo + weather + ranking | Composition without logic — easy to trace data flow |

---

## Project Structure

```
src/
├── config/
│   └── env.ts                  # Centralised env + config values
├── graphql/
│   ├── schema/
│   │   └── typeDefs.ts         # SDL schema with full JSDoc comments
│   ├── resolvers/
│   │   └── index.ts            # Thin resolvers — validation + delegation
│   └── server.ts               # ApolloServer factory (reusable in tests)
├── services/
│   ├── geocodingService.ts     # Open-Meteo Geocoding API wrapper
│   ├── weatherService.ts       # Open-Meteo Forecast API wrapper
│   ├── activityRankingService.ts # Pure scoring engine
│   └── forecastService.ts      # Orchestrator use-case
├── utils/
│   └── httpClient.ts           # Axios factory with logging interceptor
├── types/
│   └── index.ts                # Shared TypeScript interfaces & DTOs
├── __tests__/
│   ├── unit/                   # Service-level unit tests (mocked HTTP)
│   └── integration/            # Full GraphQL request tests via Supertest
├── app.ts                      # Express app factory (DI wiring)
└── index.ts                    # Bootstrap entry point
```

---

## GraphQL Schema

### Queries

#### `citySuggestions`
Returns matching cities for a partial or complete city name.

```graphql
query {
  citySuggestions(query: "Lon", limit: 5) {
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
```

#### `weatherForecast`
Returns a 24-hour weather summary and ranked activities for a city ID (obtained from `citySuggestions`).

```graphql
query {
  weatherForecast(cityId: "2643743") {
    cityName
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
```

### Types

| Type | Description |
|---|---|
| `City` | Geocoded city with coordinates and metadata |
| `WeatherSummary` | Aggregated 24-hour weather (avg temp, total precip, etc.) |
| `ActivityRanking` | Activity + numeric score (0–100) + recommendation label + reason |
| `WeatherForecast` | Composed response: city + summary + ranked activities |
| `ActivityType` | Enum: `SKIING`, `SURFING`, `INDOOR_SIGHTSEEING`, `OUTDOOR_SIGHTSEEING` |
| `RecommendationLevel` | Enum: `GREAT`, `GOOD`, `FAIR`, `POOR` |

---

## External APIs

Both APIs are **free, no API key required**.

| Service | URL | Usage |
|---|---|---|
| Open-Meteo Geocoding | `https://geocoding-api.open-meteo.com/v1` | City name → coordinates + ID |
| Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | Coordinates → hourly weather data |

Weather variables fetched: `temperature_2m`, `precipitation`, `windspeed_10m`, `snowfall`, `weathercode`, `visibility`.

---

## Activity Scoring Logic

Each activity has a dedicated scorer that returns a 0–100 integer based on weather conditions. Activities are returned sorted highest-to-lowest.

| Activity | Key Factors |
|---|---|
| **Skiing** | Sub-zero temps (+40), fresh snowfall (+35), low wind, visibility |
| **Surfing** | Warm air (>15°C), moderate wind 15–40 km/h (+35), no snow |
| **Indoor Sightseeing** | Base score of 30 + bonuses for bad weather (rain, cold, poor visibility) |
| **Outdoor Sightseeing** | Comfortable 15–28°C, no rain, good visibility, calm wind |

Score → Recommendation mapping:

| Score | Label |
|---|---|
| ≥ 75 | `GREAT` |
| ≥ 50 | `GOOD` |
| ≥ 25 | `FAIR` |
| < 25 | `POOR` |

---

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

**32 tests across 4 suites:**

| Suite | Type | What it covers |
|---|---|---|
| `activityRankingService.test.ts` | Unit | All 4 scorers, score bounds, recommendation labels |
| `weatherService.test.ts` | Unit | Aggregation math, HTTP error handling, edge cases |
| `geocodingService.test.ts` | Unit | DTO mapping, empty results, short query guard |
| `graphql.test.ts` | Integration | Full HTTP request/response via Supertest, error codes |

### Testing strategy

- **Unit tests** use `axios-mock-adapter` to inject controlled API responses — no network calls.
- **Integration tests** inject mock services via Apollo's context, so no external APIs are called.
- `ActivityRankingService` has zero I/O, making it the most exhaustively unit-tested component.

---

## Omissions & Trade-offs

| Omission | Reason |
|---|---|
| **Caching** (Redis / in-memory) | Weather data changes slowly; a TTL cache would eliminate redundant API calls. Skipped to stay within time budget. |
| **DataLoader** (N+1 prevention) | Not needed — the current schema has no list-of-entity patterns that would cause N+1 queries. |
| **Authentication / rate limiting** | Out of scope for a public demo API. Would use JWT middleware + `express-rate-limit` in production. |
| **Pagination on citySuggestions** | Limit parameter caps results at 10. Cursor-based pagination would be added if results grew large. |
| **Persisted queries** | Useful for production Apollo clients but not required here. |
| **Docker / CI config** | Kept out to reduce deliverable surface area; `npm run build` produces a runnable `dist/`. |

---

## Future Improvements

1. **Caching layer** — Cache geocoding results (city data is static) and weather data (5–30 minute TTL).
2. **Multi-day forecast** — Extend `weatherForecast` to accept a `days: Int` argument and return an array of daily summaries.
3. **More activities** — The `ActivityRankingService` is designed to be extended: add a new scorer method and add the enum value to the schema.
4. **Subscription for live weather** — Apollo Subscriptions + WebSocket to push weather updates to clients.
5. **OpenAPI / REST adapter** — For consumers that can't use GraphQL, expose a thin REST layer that calls the same service layer.

---

## AI Tool Usage

Claude (Anthropic) was used to:

- **Scaffold boilerplate** — initial Express + Apollo wiring, tsconfig, jest config.
- **Scoring rubric design** — drafted initial activity scoring weights; manually calibrated thresholds after reasoning about real-world conditions (e.g. skiing needs sub-zero *and* snowfall, not just one).
- **Test case generation** — AI suggested a comprehensive set of edge cases (empty query, single-entry arrays, HTTP 500s). Each was reviewed for relevance before inclusion.
