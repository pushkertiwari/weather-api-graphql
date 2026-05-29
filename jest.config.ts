import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/types/**"],
  coverageDirectory: "coverage",
  moduleFileExtensions: ["ts", "js", "json"],
};

export default config;
