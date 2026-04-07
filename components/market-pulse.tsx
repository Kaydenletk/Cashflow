"use client";

import clsx from "clsx";

import type { MarketCard } from "@/lib/types/domain";

export function MarketPulse({ cards, marketState }: { cards: MarketCard[]; marketState: string }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral">Market Pulse</p>
          <h2 className="text-sm font-medium text-white">{marketState}</h2>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Compact</div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.slice(0, 4).map((card) => (
          <div
            key={card.symbol}
            className="rounded-2xl border border-white/8 bg-black/20 p-3 transition hover:border-signal/40 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{card.symbol}</p>
                <p className="text-xs text-neutral">{card.label}</p>
              </div>
              <div
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  card.changePercent >= 0 ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
                )}
              >
                {(card.changePercent * 100).toFixed(2)}%
              </div>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">{card.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
