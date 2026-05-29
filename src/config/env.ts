import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  openMeteo: {
    baseUrl: process.env.OPEN_METEO_BASE_URL || "https://api.open-meteo.com/v1",
    geocodingUrl:
      process.env.GEOCODING_BASE_URL || "https://geocoding-api.open-meteo.com/v1",
  },
  nodeEnv: process.env.NODE_ENV || "development",
} as const;

export type Config = typeof config;
