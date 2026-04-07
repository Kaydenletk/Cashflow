export type Bias = "Bullish" | "Bearish" | "Neutral";

export type MarketCard = {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  marketState: string;
};

export type NewsItem = {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: "Positive" | "Negative" | "Neutral";
};

export type LevelKey =
  | "currentPrice"
  | "previousHigh"
  | "previousLow"
  | "weeklyHigh"
  | "weeklyLow"
  | "swingHigh"
  | "swingLow"
  | "fib50"
  | "orbHigh"
  | "orbLow"
  | "vwap"
  | "invalidation"
  | "targetLow"
  | "targetHigh";

export type PriceLevel = {
  key: LevelKey;
  label: string;
  value: number | null;
  emphasis?: "primary" | "secondary" | "muted";
};

export type ChartPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type FeatureVector = {
  priceVsPreviousHigh: number;
  priceVsPreviousLow: number;
  priceVsWeeklyHigh: number;
  priceVsWeeklyLow: number;
  priceVsFib50: number;
  rsi14: number;
  macdHistogram: number;
  trendSlope: number;
  volumeExpansion: number;
  atrRatio: number;
};

export type ModelMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  hitRate: number;
  calibrationError: number;
  samples: number;
  modelVersion: string;
  trainedAt: string;
};

export type PredictionSummary = {
  symbol: string;
  bias: Bias;
  confidence: number;
  probabilityUp: number;
  confluenceScore: number;
  mlScore: number;
  targetLow: number | null;
  targetHigh: number | null;
  invalidation: number | null;
  setup: string;
  reasons: string[];
  warnings: string[];
  metrics: ModelMetrics;
};

export type SnapshotResponse = {
  symbol: string;
  label: string;
  quote: {
    price: number;
    changePercent: number;
    previousClose: number;
    volume: number;
    marketCap?: number;
  };
  chart: ChartPoint[];
  intradayChart: ChartPoint[];
  levels: PriceLevel[];
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
  news: NewsItem[];
  marketState: string;
};

export type ScannerRow = {
  symbol: string;
  label: string;
  bias: Bias;
  confidence: number;
  opportunityScore: number;
  setup: string;
  price: number;
  changePercent: number;
  targetHigh: number | null;
  invalidation: number | null;
};

export type BacktestReport = {
  universe: string[];
  horizonDays: number;
  generatedAt: string;
  metrics: ModelMetrics;
  bySymbol: Array<{
    symbol: string;
    accuracy: number;
    hitRate: number;
    samples: number;
  }>;
};
