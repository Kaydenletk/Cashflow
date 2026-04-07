"use client";

import { useQuery } from "@tanstack/react-query";
import { startTransition, useDeferredValue, useState } from "react";

import { Chatboard } from "@/components/chatboard";
import { MarketPulse } from "@/components/market-pulse";
import { PredictionPanel } from "@/components/prediction-panel";
import { ScannerTable } from "@/components/scanner-table";
import { TickerWorkspace } from "@/components/ticker-workspace";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import type { PredictionSummary, ScannerRow, SnapshotResponse } from "@/lib/types/domain";

async function getJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json() as Promise<T>;
}

export function DashboardApp({
  defaultSymbol
}: {
  defaultSymbol: string;
}) {
  const { selectedSymbol, setSelectedSymbol, scannerFilter } = useDashboardStore();
  const [symbolInput, setSymbolInput] = useState(defaultSymbol);
  const deferredFilter = useDeferredValue(scannerFilter);

  const pulseQuery = useQuery({
    queryKey: ["market-pulse"],
    queryFn: () => getJson<{ cards: Array<{ symbol: string; label: string; price: number; changePercent: number; marketState: string }>; marketState: string }>("/api/market/pulse")
  });

  const scannerQuery = useQuery({
    queryKey: ["scanner"],
    queryFn: () => getJson<{ rows: ScannerRow[] }>("/api/scanner")
  });

  const snapshotQuery = useQuery({
    queryKey: ["snapshot", selectedSymbol],
    queryFn: () => getJson<SnapshotResponse>(`/api/ticker/${selectedSymbol}/snapshot`)
  });

  const predictionQuery = useQuery({
    queryKey: ["prediction", selectedSymbol],
    queryFn: () => getJson<PredictionSummary>(`/api/ticker/${selectedSymbol}/prediction`)
  });

  const filteredRows =
    scannerQuery.data?.rows.filter((row) =>
      !deferredFilter ? true : row.symbol.toLowerCase().includes(deferredFilter.toLowerCase()) || row.label.toLowerCase().includes(deferredFilter.toLowerCase())
    ) ?? [];

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1280px] space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.26em] text-neutral">
                FinBoard AI
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  Minimal Mode
                </div>
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-white">
                One clean board for checking the market fast.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                Search a ticker, read the structure, inspect the prediction, then move on.
              </p>
            </div>
            <div className="grid gap-3 md:min-w-[420px]">
              <div className="flex gap-2">
                <input
                  value={symbolInput}
                  onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-signal/40"
                  placeholder="NQ=F"
                />
                <button
                  type="button"
                  onClick={() => startTransition(() => setSelectedSymbol(symbolInput))}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5 hover:bg-signal"
                >
                  Load
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Market State", pulseQuery.data?.marketState ?? "Loading"],
                  ["Ticker", selectedSymbol],
                  ["Default", defaultSymbol]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral">{label}</p>
                    <p className="mt-2 text-base font-medium text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {pulseQuery.data ? <MarketPulse cards={pulseQuery.data.cards} marketState={pulseQuery.data.marketState} /> : null}

        <div className="grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
          <div className="space-y-4">
            {snapshotQuery.data ? (
              <TickerWorkspace snapshot={snapshotQuery.data} />
            ) : (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-300">Loading chart...</p>
              </section>
            )}

            {scannerQuery.data ? (
              <ScannerTable
                rows={filteredRows}
                selectedSymbol={selectedSymbol}
                onSelect={(symbol) => {
                  setSymbolInput(symbol);
                  startTransition(() => setSelectedSymbol(symbol));
                }}
              />
            ) : (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-300">Loading scanner...</p>
              </section>
            )}
          </div>

          <div className="space-y-4">
            {predictionQuery.data ? (
              <PredictionPanel prediction={predictionQuery.data} />
            ) : (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-300">Loading prediction...</p>
              </section>
            )}
            <Chatboard symbol={selectedSymbol} />
          </div>
        </div>
      </div>
    </div>
  );
}
