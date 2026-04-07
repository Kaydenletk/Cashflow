import { describe, expect, it } from "vitest";

import { evaluateConfluence } from "@/lib/engine/confluence";
import { computeFeatureVector } from "@/lib/engine/features";
import type { ChartPoint } from "@/lib/types/domain";

function makeCandle(index: number): ChartPoint {
  const base = 100 + index;
  return {
    date: new Date(2024, 0, index + 1).toISOString(),
    open: base,
    high: base + 2,
    low: base - 1.5,
    close: base + 1,
    volume: 1000 + index * 10
  };
}

describe("feature engine", () => {
  it("computes key indicators and levels", () => {
    const daily = Array.from({ length: 90 }, (_, index) => makeCandle(index));
    const intraday = Array.from({ length: 30 }, (_, index) => ({
      ...makeCandle(index),
      date: new Date(2024, 3, 1, 9, 30 + index * 15).toISOString()
    }));

    const result = computeFeatureVector(daily, intraday);

    expect(result.indicators.rsi14).toBeGreaterThan(50);
    expect(result.levels.find((level) => level.key === "fib50")?.value).not.toBeNull();
    expect(result.features.volumeExpansion).toBeGreaterThan(0);
  });

  it("creates a bullish confluence for strong structure", () => {
    const levels = [
      { key: "previousHigh", label: "Yesterday High", value: 105 },
      { key: "previousLow", label: "Yesterday Low", value: 99 },
      { key: "weeklyHigh", label: "Weekly High", value: 106 },
      { key: "weeklyLow", label: "Weekly Low", value: 98 },
      { key: "fib50", label: "Fib 50%", value: 102 },
      { key: "orbHigh", label: "ORB High", value: 106.5 },
      { key: "orbLow", label: "ORB Low", value: 103 },
      { key: "vwap", label: "VWAP", value: 104.5 }
    ] as const;

    const result = evaluateConfluence(
      {
        priceVsPreviousHigh: 0.02,
        priceVsPreviousLow: 0.08,
        priceVsWeeklyHigh: 0.005,
        priceVsWeeklyLow: 0.1,
        priceVsFib50: 0.03,
        rsi14: 61,
        macdHistogram: 1.2,
        trendSlope: 0.7,
        volumeExpansion: 1.3,
        atrRatio: 0.025
      },
      levels as never,
      107
    );

    expect(result.bias).toBe("Bullish");
    expect(result.confluenceScore).toBeGreaterThan(60);
  });
});
