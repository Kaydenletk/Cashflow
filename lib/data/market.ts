import { formatISO } from "date-fns";

import { MARKET_PULSE_SYMBOLS } from "@/lib/data/universe";
import { round } from "@/lib/engine/math";
import type { MarketCard } from "@/lib/types/domain";

type QuoteResult = {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fullExchangeName?: string;
  exchange?: string;
};

type QuoteResponse = {
  quoteResponse?: {
    result?: QuoteResult[];
  };
};

type ChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

function symbolSeed(symbol: string) {
  return symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function generateFallbackQuote(symbol: string): QuoteResult {
  const seed = symbolSeed(symbol);
  const price = 40 + (seed % 320) + ((seed % 17) / 10);
  const previousClose = price * (0.985 + (seed % 7) * 0.003);

  return {
    symbol,
    shortName: `${symbol} Synthetic Feed`,
    regularMarketPrice: round(price, 2) ?? price,
    regularMarketPreviousClose: round(previousClose, 2) ?? previousClose,
    regularMarketChangePercent: ((price - previousClose) / previousClose) * 100,
    regularMarketVolume: 900_000 + (seed % 50) * 25_000,
    marketCap: 50_000_000_000 + seed * 10_000_000,
    fullExchangeName: "Fallback Feed"
  };
}

function generateFallbackChart(symbol: string, intraday = false) {
  const seed = symbolSeed(symbol);
  const points = intraday ? 26 : 260;
  const start = intraday ? Date.now() - points * 15 * 60 * 1000 : Date.now() - points * 24 * 60 * 60 * 1000;
  let lastClose = 40 + (seed % 320);

  return {
    timestamp: Array.from({ length: points }, (_, index) =>
      Math.floor((start + index * (intraday ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000)) / 1000)
    ),
    indicators: {
      quote: [
        {
          open: Array.from({ length: points }, (_, index) => {
            const drift = Math.sin((index + seed) / 11) * 1.6 + index * 0.04;
            return round(lastClose + drift, 2);
          }),
          high: Array.from({ length: points }, (_, index) => {
            const open = lastClose + Math.sin((index + seed) / 11) * 1.6 + index * 0.04;
            const high = open + 1.8 + ((seed + index) % 4) * 0.4;
            return round(high, 2);
          }),
          low: Array.from({ length: points }, (_, index) => {
            const open = lastClose + Math.sin((index + seed) / 11) * 1.6 + index * 0.04;
            const low = open - 1.6 - ((seed + index) % 3) * 0.35;
            return round(low, 2);
          }),
          close: Array.from({ length: points }, (_, index) => {
            const close = lastClose + Math.sin((index + seed) / 7) * 1.4 + index * 0.05;
            lastClose = close;
            return round(close, 2);
          }),
          volume: Array.from({ length: points }, (_, index) => 700_000 + ((seed + index) % 15) * 55_000)
        }
      ]
    }
  };
}

function getMarketState() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 570) return "Pre-market";
  if (totalMinutes < 720) return "Cash Session";
  if (totalMinutes < 840) return "Midday";
  if (totalMinutes < 960) return "Power Hour";
  return "After hours";
}

function normalizeQuote(quote: QuoteResult, label: string): MarketCard {
  return {
    symbol: quote.symbol,
    label,
    price: round(quote.regularMarketPrice ?? 0, 2) ?? 0,
    changePercent: round((quote.regularMarketChangePercent ?? 0) / 100, 4) ?? 0,
    marketState: getMarketState()
  };
}

async function fetchQuote(symbols: string[]) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`,
      {
        next: { revalidate: 60 },
        headers: {
          "User-Agent": "Mozilla/5.0 FinBoardAI"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Yahoo quote request failed");
    }

    const payload = (await response.json()) as QuoteResponse;
    return payload.quoteResponse?.result ?? symbols.map((symbol) => generateFallbackQuote(symbol));
  } catch {
    return symbols.map((symbol) => generateFallbackQuote(symbol));
  }
}

async function fetchChart(symbol: string, interval: string, range: string, includePrePost = true) {
  try {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set("interval", interval);
    url.searchParams.set("range", range);
    url.searchParams.set("includePrePost", includePrePost ? "true" : "false");

    const response = await fetch(url.toString(), {
      next: { revalidate: interval === "1d" ? 3600 : 300 },
      headers: {
        "User-Agent": "Mozilla/5.0 FinBoardAI"
      }
    });
    if (!response.ok) {
      throw new Error(`Yahoo chart request failed for ${symbol}`);
    }

    const payload = (await response.json()) as ChartResponse;
    return payload.chart?.result?.[0] ?? generateFallbackChart(symbol, interval !== "1d");
  } catch {
    return generateFallbackChart(symbol, interval !== "1d");
  }
}

function toChartPoint(result?: {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}) {
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];

  return timestamps
    .map((timestamp, index) => ({
      date: formatISO(new Date(timestamp * 1000)),
      open: quote?.open?.[index] ?? 0,
      high: quote?.high?.[index] ?? 0,
      low: quote?.low?.[index] ?? 0,
      close: quote?.close?.[index] ?? 0,
      volume: quote?.volume?.[index] ?? 0
    }))
    .filter((point) => point.close > 0);
}

export async function getMarketPulse() {
  const quotes = await fetchQuote(MARKET_PULSE_SYMBOLS.map(({ symbol }) => symbol));
  const results = MARKET_PULSE_SYMBOLS.map(({ symbol, label }) => {
    const quote = quotes.find((item) => item.symbol === symbol) ?? { symbol };
    return normalizeQuote(quote, label);
  });

  return {
    generatedAt: formatISO(new Date()),
    marketState: getMarketState(),
    cards: results
  };
}

export async function getTickerSnapshotData(symbol: string) {
  const normalizedSymbol = symbol.toUpperCase();
  const [[quote], dailyChart, intradayChart] = await Promise.all([
    fetchQuote([normalizedSymbol]),
    fetchChart(normalizedSymbol, "1d", "1y"),
    fetchChart(normalizedSymbol, "15m", "5d")
  ]);

  return {
    symbol: normalizedSymbol,
    quote: quote ?? { symbol: normalizedSymbol },
    dailyCandles: toChartPoint(dailyChart),
    intradayCandles: toChartPoint(intradayChart)
  };
}
