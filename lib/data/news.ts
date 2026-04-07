import type { NewsItem } from "@/lib/types/domain";

type FinnhubArticle = {
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary?: string;
};

function inferSentiment(text: string): NewsItem["sentiment"] {
  const lowered = text.toLowerCase();
  if (/(beats|upgrade|surge|wins|growth|record|bullish)/.test(lowered)) {
    return "Positive";
  }
  if (/(misses|downgrade|cuts|lawsuit|bearish|probe|weakness)/.test(lowered)) {
    return "Negative";
  }
  return "Neutral";
}

export async function getTickerNews(symbol: string): Promise<NewsItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return [];
  }

  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const response = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as FinnhubArticle[];

  return payload.slice(0, 5).map((article) => ({
    headline: article.headline,
    source: article.source,
    url: article.url,
    publishedAt: new Date(article.datetime * 1000).toISOString(),
    sentiment: inferSentiment(`${article.headline} ${article.summary ?? ""}`)
  }));
}
