"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { SnapshotResponse } from "@/lib/types/domain";

export function TickerWorkspace({ snapshot }: { snapshot: SnapshotResponse }) {
  const visibleLevels = snapshot.levels.filter((level) =>
    ["previousHigh", "previousLow", "weeklyHigh", "fib50"].includes(level.key)
  );
  const compactLevels = snapshot.levels.filter((level) =>
    ["previousHigh", "previousLow", "weeklyHigh", "fib50", "invalidation", "targetHigh"].includes(level.key)
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral">Workspace</p>
          <h2 className="text-2xl font-semibold text-white">
            {snapshot.symbol}
            <span className="ml-2 text-sm font-normal text-neutral">{snapshot.label}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-300">{snapshot.marketState}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-white">{snapshot.quote.price.toFixed(2)}</p>
          <p className={snapshot.quote.changePercent >= 0 ? "text-bull" : "text-bear"}>
            {(snapshot.quote.changePercent * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Price Structure</p>
            <p className="text-xs text-neutral">120 sessions</p>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshot.chart.slice(-120)}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 3", "dataMax + 3"]} tickLine={false} axisLine={false} tick={{ fill: "#8ea5bf", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0d1523",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16
                  }}
                />
                {visibleLevels.map((level) =>
                  level.value ? (
                    <ReferenceLine
                      key={level.key}
                      y={level.value}
                      stroke={level.key === "fib50" ? "#f4bf4f" : "#35d0ff"}
                      strokeDasharray="5 5"
                    />
                  ) : null
                )}
                <Line type="monotone" dataKey="close" stroke="#35d0ff" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 grid-cols-2">
            {[
              ["RSI", snapshot.indicators.rsi14.toFixed(1)],
              ["MACD", snapshot.indicators.macdHistogram.toFixed(2)],
              ["ATR", snapshot.indicators.atr14.toFixed(2)],
              ["Volume", `${snapshot.indicators.volumeExpansion.toFixed(2)}x`]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:border-signal/30 hover:bg-white/[0.04]"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-neutral">{label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="mb-3 text-sm font-medium text-white">Key Levels</p>
            <div className="grid gap-2">
              {compactLevels.map((level) => (
                <div key={level.key} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="text-sm text-slate-300">{level.label}</span>
                  <span className="text-sm font-medium text-white">
                    {level.value !== null ? level.value.toFixed(2) : "n/a"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {snapshot.news.length ? (
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="mb-2 text-sm font-medium text-white">Catalyst</p>
              <a href={snapshot.news[0].url} target="_blank" rel="noreferrer" className="text-sm leading-6 text-slate-300 transition hover:text-white">
                {snapshot.news[0].headline}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
