import {
  WeatherSummaryDto,
  ActivityRankingDto,
  ActivityType,
  RecommendationLevel,
} from "../types";

/**
 * ActivityRankingService
 * Pure, stateless scoring engine — no I/O, no external dependencies.
 * Each activity has a dedicated scorer function that returns 0–100.
 * This isolation makes the logic trivially unit-testable.
 */
export class ActivityRankingService {
  rankActivities(weather: WeatherSummaryDto): ActivityRankingDto[] {
    const activities: ActivityType[] = [
      "SKIING",
      "SURFING",
      "INDOOR_SIGHTSEEING",
      "OUTDOOR_SIGHTSEEING",
    ];

    return activities
      .map((activity) => this.score(activity, weather))
      .sort((a, b) => b.score - a.score);
  }

  // ─── Dispatching ─────────────────────────────────────────────────────────

  private score(
    activity: ActivityType,
    w: WeatherSummaryDto
  ): ActivityRankingDto {
    switch (activity) {
      case "SKIING":
        return this.scoreSkiing(w);
      case "SURFING":
        return this.scoreSurfing(w);
      case "INDOOR_SIGHTSEEING":
        return this.scoreIndoor(w);
      case "OUTDOOR_SIGHTSEEING":
        return this.scoreOutdoor(w);
    }
  }

  // ─── Scorers ─────────────────────────────────────────────────────────────

  private scoreSkiing(w: WeatherSummaryDto): ActivityRankingDto {
    let score = 0;
    const reasons: string[] = [];

    // Temperature: ideally well below freezing
    if (w.temperature < -5) {
      score += 40;
      reasons.push("excellent freezing temps");
    } else if (w.temperature < 0) {
      score += 25;
      reasons.push("good freezing temps");
    } else if (w.temperature < 5) {
      score += 10;
      reasons.push("marginal temps");
    } else {
      reasons.push("too warm for skiing");
    }

    // Snowfall: fresh snow is a big bonus
    if (w.snowfall > 10) {
      score += 35;
      reasons.push("heavy fresh snowfall");
    } else if (w.snowfall > 3) {
      score += 20;
      reasons.push("moderate snowfall");
    } else if (w.snowfall > 0) {
      score += 10;
      reasons.push("light snowfall");
    }

    // Wind: strong wind is bad (blizzard risk)
    if (w.windspeed < 20) {
      score += 15;
    } else if (w.windspeed < 40) {
      score += 8;
      reasons.push("moderate wind");
    } else {
      reasons.push("high wind – risk of closures");
    }

    // Visibility: important for safety
    if (w.visibility > 10) {
      score += 10;
    } else if (w.visibility > 5) {
      score += 5;
    } else {
      reasons.push("poor visibility");
    }

    return this.build("SKIING", score, reasons.join(", "));
  }

  private scoreSurfing(w: WeatherSummaryDto): ActivityRankingDto {
    let score = 0;
    const reasons: string[] = [];

    // Temperature: warm air is ideal
    if (w.temperature >= 20) {
      score += 30;
      reasons.push("warm air temp");
    } else if (w.temperature >= 15) {
      score += 18;
      reasons.push("mild air temp");
    } else if (w.temperature >= 10) {
      score += 8;
      reasons.push("cool but manageable");
    } else {
      reasons.push("too cold for comfortable surfing");
    }

    // Wind: surfers need wind for waves, but not a storm
    if (w.windspeed >= 15 && w.windspeed <= 40) {
      score += 35;
      reasons.push("ideal surf wind");
    } else if (w.windspeed < 15) {
      score += 10;
      reasons.push("light wind – small waves");
    } else {
      score += 5;
      reasons.push("dangerously high wind");
    }

    // No snow (obviously)
    if (w.snowfall === 0) score += 15;

    // Precipitation: light rain is fine, heavy is not
    if (w.precipitation < 5) {
      score += 20;
    } else if (w.precipitation < 15) {
      score += 10;
      reasons.push("some rain");
    } else {
      reasons.push("heavy rain – poor conditions");
    }

    return this.build("SURFING", score, reasons.join(", "));
  }

  private scoreIndoor(w: WeatherSummaryDto): ActivityRankingDto {
    let score = 0;
    const reasons: string[] = [];

    // Indoor activities get a base score — always doable
    score += 30;

    // Bad weather is actually a BOOST for indoor activities
    if (w.precipitation > 10) {
      score += 30;
      reasons.push("rainy – great day to stay inside");
    } else if (w.precipitation > 3) {
      score += 15;
      reasons.push("some rain encourages indoor plans");
    }

    if (w.temperature < 0) {
      score += 20;
      reasons.push("freezing outside");
    } else if (w.temperature < 8) {
      score += 10;
      reasons.push("cold outside");
    }

    if (w.visibility < 3) {
      score += 10;
      reasons.push("poor visibility outdoors");
    }

    if (w.windspeed > 50) {
      score += 10;
      reasons.push("dangerous wind outside");
    }

    reasons.unshift("museums, galleries, and cafés always available");

    return this.build("INDOOR_SIGHTSEEING", score, reasons.join(", "));
  }

  private scoreOutdoor(w: WeatherSummaryDto): ActivityRankingDto {
    let score = 0;
    const reasons: string[] = [];

    // Temperature: comfortable range 15–28°C
    if (w.temperature >= 15 && w.temperature <= 28) {
      score += 35;
      reasons.push("comfortable temperature");
    } else if (w.temperature > 28) {
      score += 20;
      reasons.push("hot but manageable");
    } else if (w.temperature >= 8) {
      score += 15;
      reasons.push("cool but fine with layers");
    } else {
      score += 5;
      reasons.push("cold – dress warmly");
    }

    // Precipitation: dry is ideal
    if (w.precipitation === 0) {
      score += 30;
      reasons.push("no rain");
    } else if (w.precipitation < 3) {
      score += 15;
      reasons.push("minimal rain");
    } else {
      reasons.push("rainy conditions");
    }

    // Visibility: good visibility enhances sightseeing
    if (w.visibility > 15) {
      score += 20;
      reasons.push("great visibility");
    } else if (w.visibility > 8) {
      score += 12;
    } else {
      reasons.push("limited visibility");
    }

    // Wind: calm is better
    if (w.windspeed < 20) {
      score += 15;
    } else if (w.windspeed < 40) {
      score += 5;
      reasons.push("windy");
    } else {
      reasons.push("very windy – unpleasant outdoors");
    }

    return this.build("OUTDOOR_SIGHTSEEING", score, reasons.join(", "));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private build(
    activity: ActivityType,
    rawScore: number,
    reason: string
  ): ActivityRankingDto {
    const score = Math.min(100, Math.max(0, rawScore));
    return {
      activity,
      score,
      recommendation: this.toLevel(score),
      reason,
    };
  }

  private toLevel(score: number): RecommendationLevel {
    if (score >= 75) return "GREAT";
    if (score >= 50) return "GOOD";
    if (score >= 25) return "FAIR";
    return "POOR";
  }
}
