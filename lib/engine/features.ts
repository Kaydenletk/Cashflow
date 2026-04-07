import { calculateAtr, calculateMacd, calculateRsi, calculateTrendSlope, calculateVolumeExpansion, calculateVwap } from "@/lib/engine/indicators";
import { round } from "@/lib/engine/math";
import type { ChartPoint, FeatureVector, PriceLevel } from "@/lib/types/domain";

function safeDelta(price: number, level: number | null) {
  if (!level) {
    return 0;
  }

  return (price - level) / level;
}

export function computeLevels(dailyCandles: ChartPoint[], intradayCandles: ChartPoint[]) {
  const latest = dailyCandles.at(-1);
  const previous = dailyCandles.at(-2);
  const trailing20 = dailyCandles.slice(-20);
  const weekly = dailyCandles.slice(-5);
  const session = intradayCandles.filter((candle) => candle.volume > 0);
  const orbRange = session.slice(0, 2);

  const swingHigh = trailing20.length ? Math.max(...trailing20.map((candle) => candle.high)) : null;
  const swingLow = trailing20.length ? Math.min(...trailing20.map((candle) => candle.low)) : null;
  const fib50 = swingHigh !== null && swingLow !== null ? swingLow + (swingHigh - swingLow) * 0.5 : null;
  const weeklyHigh = weekly.length ? Math.max(...weekly.map((candle) => candle.high)) : null;
  const weeklyLow = weekly.length ? Math.min(...weekly.map((candle) => candle.low)) : null;
  const orbHigh = orbRange.length ? Math.max(...orbRange.map((candle) => candle.high)) : null;
  const orbLow = orbRange.length ? Math.min(...orbRange.map((candle) => candle.low)) : null;
  const vwap = calculateVwap(intradayCandles);

  const levels: PriceLevel[] = [
    { key: "currentPrice", label: "Current", value: latest?.close ?? null, emphasis: "primary" },
    { key: "previousHigh", label: "Yesterday High", value: previous?.high ?? null, emphasis: "secondary" },
    { key: "previousLow", label: "Yesterday Low", value: previous?.low ?? null, emphasis: "secondary" },
    { key: "weeklyHigh", label: "Weekly High", value: weeklyHigh, emphasis: "secondary" },
    { key: "weeklyLow", label: "Weekly Low", value: weeklyLow, emphasis: "secondary" },
    { key: "swingHigh", label: "20D Swing High", value: swingHigh },
    { key: "swingLow", label: "20D Swing Low", value: swingLow },
    { key: "fib50", label: "Fib 50%", value: fib50 },
    { key: "orbHigh", label: "Opening Range High", value: orbHigh },
    { key: "orbLow", label: "Opening Range Low", value: orbLow },
    { key: "vwap", label: "VWAP", value: vwap }
  ];

  return levels.map((level) => ({ ...level, value: round(level.value ?? null) }));
}

export function computeFeatureVector(dailyCandles: ChartPoint[], intradayCandles: ChartPoint[]): {
  features: FeatureVector;
  indicators: {
    rsi14: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    atr14: number;
    volumeExpansion: number;
    trendSlope: number;
  };
  levels: PriceLevel[];
} {
  const latest = dailyCandles.at(-1);
  if (!latest) {
    throw new Error("No candles available");
  }

  const closes = dailyCandles.map((candle) => candle.close);
  const levels = computeLevels(dailyCandles, intradayCandles);
  const levelMap = Object.fromEntries(levels.map((level) => [level.key, level.value])) as Record<string, number | null>;
  const rsi14 = calculateRsi(closes);
  const macdValues = calculateMacd(closes);
  const atr14 = calculateAtr(dailyCandles);
  const volumeExpansion = calculateVolumeExpansion(dailyCandles);
  const trendSlope = calculateTrendSlope(closes);

  return {
    features: {
      priceVsPreviousHigh: safeDelta(latest.close, levelMap.previousHigh),
      priceVsPreviousLow: safeDelta(latest.close, levelMap.previousLow),
      priceVsWeeklyHigh: safeDelta(latest.close, levelMap.weeklyHigh),
      priceVsWeeklyLow: safeDelta(latest.close, levelMap.weeklyLow),
      priceVsFib50: safeDelta(latest.close, levelMap.fib50),
      rsi14: round(rsi14, 4) ?? 50,
      macdHistogram: round(macdValues.histogram, 6) ?? 0,
      trendSlope: round(trendSlope, 6) ?? 0,
      volumeExpansion: round(volumeExpansion, 4) ?? 1,
      atrRatio: latest.close === 0 ? 0 : round(atr14 / latest.close, 6) ?? 0
    },
    indicators: {
      rsi14: round(rsi14, 2) ?? 50,
      macd: round(macdValues.macd, 4) ?? 0,
      macdSignal: round(macdValues.signal, 4) ?? 0,
      macdHistogram: round(macdValues.histogram, 4) ?? 0,
      atr14: round(atr14, 3) ?? 0,
      volumeExpansion: round(volumeExpansion, 2) ?? 1,
      trendSlope: round(trendSlope, 4) ?? 0
    },
    levels,
  };
}
