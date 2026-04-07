import { formatISO } from "date-fns";

import { evaluateConfluence } from "@/lib/engine/confluence";
import { computeFeatureVector } from "@/lib/engine/features";
import { round } from "@/lib/engine/math";
import { fitLogisticRegression, predictProbability } from "@/lib/ml/logistic";
import type { ChartPoint, FeatureVector, ModelMetrics, PredictionSummary } from "@/lib/types/domain";

const MODEL_VERSION = "swing-5d-logistic-v1";

function toRow(features: FeatureVector) {
  return [
    features.priceVsPreviousHigh,
    features.priceVsPreviousLow,
    features.priceVsWeeklyHigh,
    features.priceVsWeeklyLow,
    features.priceVsFib50,
    features.rsi14 / 100,
    features.macdHistogram,
    features.trendSlope,
    features.volumeExpansion - 1,
    features.atrRatio
  ];
}

function labelForForwardReturn(currentPrice: number, futurePrice: number) {
  const forwardReturn = (futurePrice - currentPrice) / currentPrice;
  return forwardReturn > 0.015 ? 1 : 0;
}

function splitRows(dailyCandles: ChartPoint[]) {
  const rows: number[][] = [];
  const labels: number[] = [];

  for (let index = 60; index < dailyCandles.length - 5; index += 1) {
    const window = dailyCandles.slice(0, index + 1);
    const intradayPlaceholder = dailyCandles.slice(Math.max(0, index - 25), index + 1);
    const { features } = computeFeatureVector(window, intradayPlaceholder);
    rows.push(toRow(features));
    labels.push(labelForForwardReturn(window.at(-1)?.close ?? 0, dailyCandles[index + 5].close));
  }

  return { rows, labels };
}

function deriveMetrics(probabilities: number[], labels: number[]): Omit<ModelMetrics, "modelVersion" | "trainedAt"> {
  if (!labels.length) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      hitRate: 0,
      calibrationError: 0,
      samples: 0
    };
  }

  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let correct = 0;
  let calibrationError = 0;

  labels.forEach((label, index) => {
    const predicted = probabilities[index] >= 0.5 ? 1 : 0;
    if (predicted === label) {
      correct += 1;
    }
    if (predicted === 1 && label === 1) {
      truePositive += 1;
    }
    if (predicted === 1 && label === 0) {
      falsePositive += 1;
    }
    if (predicted === 0 && label === 1) {
      falseNegative += 1;
    }
    calibrationError += Math.abs(probabilities[index] - label);
  });

  return {
    accuracy: round(correct / labels.length, 3) ?? 0,
    precision: round(truePositive / Math.max(truePositive + falsePositive, 1), 3) ?? 0,
    recall: round(truePositive / Math.max(truePositive + falseNegative, 1), 3) ?? 0,
    hitRate: round(correct / labels.length, 3) ?? 0,
    calibrationError: round(calibrationError / labels.length, 3) ?? 0,
    samples: labels.length
  };
}

export function runPrediction(symbol: string, dailyCandles: ChartPoint[], intradayCandles: ChartPoint[]): PredictionSummary {
  const latestPrice = dailyCandles.at(-1)?.close ?? 0;
  const { rows, labels } = splitRows(dailyCandles);
  const trainCutoff = Math.max(Math.floor(rows.length * 0.8), 1);
  const trainingRows = rows.slice(0, trainCutoff);
  const trainingLabels = labels.slice(0, trainCutoff);
  const validationRows = rows.slice(trainCutoff);
  const validationLabels = labels.slice(trainCutoff);

  const model = fitLogisticRegression(trainingRows, trainingLabels);
  const validationProbabilities = validationRows.map((row) => predictProbability(model, row));
  const metrics = deriveMetrics(validationProbabilities, validationLabels);

  const latest = computeFeatureVector(dailyCandles, intradayCandles);
  const confluence = evaluateConfluence(latest.features, latest.levels, latestPrice);
  const probabilityUp = predictProbability(model, toRow(latest.features));

  const atr = latest.indicators.atr14;
  const targetHigh = latestPrice + atr * (1.5 + probabilityUp);
  const targetLow = latestPrice - atr * (1.1 + (1 - probabilityUp));
  const invalidation =
    confluence.bias === "Bullish"
      ? latest.levels.find((level) => level.key === "previousLow")?.value ?? targetLow
      : latest.levels.find((level) => level.key === "previousHigh")?.value ?? targetHigh;

  const mlScore = round(probabilityUp * 100, 0) ?? 50;
  const finalBlend = round(confluence.confluenceScore * 0.55 + mlScore * 0.45, 0) ?? 50;
  const finalBias =
    finalBlend >= 60 ? "Bullish" : finalBlend <= 40 ? "Bearish" : "Neutral";

  return {
    symbol,
    bias: finalBias,
    confidence: Math.abs(finalBlend - 50) * 2,
    probabilityUp: round(probabilityUp, 3) ?? 0.5,
    confluenceScore: confluence.confluenceScore,
    mlScore,
    targetLow: round(targetLow, 2),
    targetHigh: round(targetHigh, 2),
    invalidation: round(invalidation, 2),
    setup: confluence.setup,
    reasons: confluence.reasons,
    warnings: confluence.warnings,
    metrics: {
      ...metrics,
      modelVersion: MODEL_VERSION,
      trainedAt: formatISO(new Date())
    }
  };
}

export function runWalkForwardBacktest(symbol: string, dailyCandles: ChartPoint[]) {
  const outcomes: number[] = [];
  const labels: number[] = [];

  for (let cutoff = 110; cutoff < dailyCandles.length - 5; cutoff += 5) {
    const training = dailyCandles.slice(0, cutoff);
    const evaluation = dailyCandles.slice(0, cutoff + 1);
    const intradayPlaceholder = evaluation.slice(-26);
    const { rows, labels: trainLabels } = splitRows(training);
    const model = fitLogisticRegression(rows, trainLabels);
    const latestFeatures = computeFeatureVector(evaluation, intradayPlaceholder).features;
    const probability = predictProbability(model, toRow(latestFeatures));
    const actual = labelForForwardReturn(dailyCandles[cutoff].close, dailyCandles[cutoff + 5].close);

    outcomes.push(probability);
    labels.push(actual);
  }

  const metrics = deriveMetrics(outcomes, labels);

  return {
    symbol,
    accuracy: metrics.accuracy,
    hitRate: metrics.hitRate,
    samples: metrics.samples
  };
}
