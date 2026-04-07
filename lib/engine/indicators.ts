import { mean } from "@/lib/engine/math";
import type { ChartPoint } from "@/lib/types/domain";

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  let current = values[0] ?? 0;

  return values.map((value, index) => {
    if (index === 0) {
      current = value;
      return current;
    }

    current = (value - current) * multiplier + current;
    return current;
  });
}

export function calculateRsi(closes: number[], period = 14) {
  if (closes.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMacd(closes: number[]) {
  if (closes.length < 35) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = closes.map((_, index) => ema12[index] - ema26[index]);
  const signalLine = ema(macdLine, 9);
  const macd = macdLine.at(-1) ?? 0;
  const signal = signalLine.at(-1) ?? 0;

  return {
    macd,
    signal,
    histogram: macd - signal
  };
}

export function calculateAtr(candles: ChartPoint[], period = 14) {
  if (candles.length <= period) {
    return 0;
  }

  const ranges: number[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    const range = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    ranges.push(range);
  }

  return mean(ranges.slice(-period));
}

export function calculateTrendSlope(closes: number[], lookback = 20) {
  const sample = closes.slice(-lookback);
  if (sample.length < lookback) {
    return 0;
  }

  const xMean = (sample.length - 1) / 2;
  const yMean = mean(sample);

  let numerator = 0;
  let denominator = 0;

  sample.forEach((close, index) => {
    numerator += (index - xMean) * (close - yMean);
    denominator += (index - xMean) ** 2;
  });

  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateVolumeExpansion(candles: ChartPoint[], lookback = 20) {
  if (candles.length < lookback + 1) {
    return 1;
  }

  const volumes = candles.slice(-(lookback + 1), -1).map((candle) => candle.volume);
  const latest = candles.at(-1)?.volume ?? 0;
  const baseline = mean(volumes);

  return baseline === 0 ? 1 : latest / baseline;
}

export function calculateVwap(candles: ChartPoint[]) {
  const session = candles.slice(-26);
  if (!session.length) {
    return null;
  }

  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;

  session.forEach((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeVolume += candle.volume;
    cumulativePriceVolume += typicalPrice * candle.volume;
  });

  return cumulativeVolume === 0 ? null : cumulativePriceVolume / cumulativeVolume;
}
