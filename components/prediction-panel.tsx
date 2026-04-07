"use client";

import clsx from "clsx";

import type { PredictionSummary } from "@/lib/types/domain";

export function PredictionPanel({ prediction }: { prediction: PredictionSummary }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral">Prediction</p>
          <h2 className="text-xl font-semibold text-white">{prediction.symbol}</h2>
        </div>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium",
            prediction.bias === "Bullish"
              ? "bg-bull/15 text-bull"
              : prediction.bias === "Bearish"
                ? "bg-bear/15 text-bear"
                : "bg-white/10 text-slate-200"
          )}
        >
          {prediction.bias}
        </span>
      </div>

      <div className="grid gap-3 grid-cols-2">
        {[
          ["Up", `${Math.round(prediction.probabilityUp * 100)}%`],
          ["Confidence", `${Math.round(prediction.confidence)}`],
          ["Confluence", `${prediction.confluenceScore}`],
          ["ML", `${prediction.mlScore}`]
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:border-signal/30 hover:bg-white/[0.04]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-neutral">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-neutral">Trade Map</p>
        <div className="mt-3 grid gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Setup</span>
            <span className="text-white">{prediction.setup}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Target</span>
            <span className="text-white">
              {prediction.targetLow?.toFixed(2)} - {prediction.targetHigh?.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Invalidation</span>
            <span className="text-white">{prediction.invalidation?.toFixed(2) ?? "n/a"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="mb-3 text-sm font-medium text-white">Why</p>
        <div className="space-y-2">
          {prediction.reasons.slice(0, 3).map((reason) => (
            <div key={reason} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
              {reason}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="mb-3 text-sm font-medium text-white">Risk</p>
        <div className="space-y-2">
          {prediction.warnings.slice(0, 2).map((warning) => (
            <div key={warning} className="rounded-xl bg-bear/8 px-3 py-2 text-sm text-slate-200">
              {warning}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
