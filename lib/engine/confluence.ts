import { clamp, round } from "@/lib/engine/math";
import type { Bias, FeatureVector, PriceLevel } from "@/lib/types/domain";

function getLevel(levels: PriceLevel[], key: string) {
  return levels.find((level) => level.key === key)?.value ?? null;
}

export function evaluateConfluence(features: FeatureVector, levels: PriceLevel[], price: number) {
  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (features.priceVsPreviousHigh > 0) {
    score += 10;
    reasons.push("Price is holding above yesterday high.");
  } else {
    score -= 8;
    warnings.push("Price has not reclaimed yesterday high.");
  }

  if (features.priceVsWeeklyHigh > -0.01) {
    score += 8;
    reasons.push("Price is pressing into weekly highs.");
  }

  if (features.priceVsPreviousLow < 0) {
    score -= 12;
    warnings.push("Price has slipped below yesterday low.");
  }

  if (features.priceVsFib50 > 0) {
    score += 6;
    reasons.push("Price is above the 20-day Fib 50 midpoint.");
  } else {
    score -= 5;
    warnings.push("Price is trading below Fib 50 support.");
  }

  if (features.rsi14 > 56 && features.rsi14 < 72) {
    score += 9;
    reasons.push("RSI supports trend continuation without being exhausted.");
  } else if (features.rsi14 >= 72) {
    score -= 4;
    warnings.push("RSI is overheated and raises pullback risk.");
  } else if (features.rsi14 < 45) {
    score -= 7;
    warnings.push("RSI is still weak for a clean swing long.");
  }

  if (features.macdHistogram > 0) {
    score += 8;
    reasons.push("MACD histogram is positive.");
  } else {
    score -= 8;
    warnings.push("MACD histogram remains negative.");
  }

  if (features.trendSlope > 0) {
    score += 7;
    reasons.push("20-session slope is rising.");
  } else {
    score -= 7;
    warnings.push("20-session slope is rolling over.");
  }

  if (features.volumeExpansion > 1.15) {
    score += 6;
    reasons.push("Volume is expanding into the move.");
  } else if (features.volumeExpansion < 0.85) {
    score -= 4;
    warnings.push("Volume conviction is light.");
  }

  const orbHigh = getLevel(levels, "orbHigh");
  const orbLow = getLevel(levels, "orbLow");
  const vwap = getLevel(levels, "vwap");

  if (orbHigh && price > orbHigh) {
    score += 4;
    reasons.push("Price is above the opening range high.");
  }

  if (orbLow && price < orbLow) {
    score -= 4;
    warnings.push("Price is below the opening range low.");
  }

  if (vwap && price > vwap) {
    score += 3;
    reasons.push("Price is above session VWAP.");
  } else if (vwap && price < vwap) {
    score -= 3;
    warnings.push("Price is below session VWAP.");
  }

  const confluenceScore = clamp(Math.round(score), 1, 99);
  let bias: Bias = "Neutral";

  if (confluenceScore >= 62) {
    bias = "Bullish";
  } else if (confluenceScore <= 38) {
    bias = "Bearish";
  }

  let setup = "Compression";
  if (bias === "Bullish" && features.priceVsPreviousHigh > 0) {
    setup = "Breakout Hold";
  } else if (bias === "Bullish" && features.priceVsFib50 > 0) {
    setup = "Pullback Recovery";
  } else if (bias === "Bearish" && features.priceVsPreviousLow < 0) {
    setup = "Breakdown Continuation";
  } else if (bias === "Bearish") {
    setup = "Failed Reclaim";
  }

  return {
    bias,
    confluenceScore,
    setup,
    reasons,
    warnings,
    confidence: round(Math.abs(confluenceScore - 50) * 2, 0) ?? 50
  };
}
