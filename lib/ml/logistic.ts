import { sigmoid } from "@/lib/engine/math";

type LogisticModel = {
  weights: number[];
  bias: number;
};

function dotProduct(weights: number[], row: number[]) {
  return weights.reduce((sum, weight, index) => sum + weight * row[index], 0);
}

export function fitLogisticRegression(rows: number[][], labels: number[], iterations = 450, learningRate = 0.08): LogisticModel {
  if (!rows.length || rows.length !== labels.length) {
    return { weights: [], bias: 0 };
  }

  const featureCount = rows[0]?.length ?? 0;
  const weights = new Array(featureCount).fill(0);
  let bias = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const label = labels[rowIndex];
      const prediction = sigmoid(dotProduct(weights, row) + bias);
      const error = prediction - label;

      for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
        weights[featureIndex] -= learningRate * error * row[featureIndex];
      }

      bias -= learningRate * error;
    }
  }

  return { weights, bias };
}

export function predictProbability(model: LogisticModel, row: number[]) {
  if (!model.weights.length) {
    return 0.5;
  }

  return sigmoid(dotProduct(model.weights, row) + model.bias);
}
