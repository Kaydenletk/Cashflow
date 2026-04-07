"use client";

import clsx from "clsx";

import type { ScannerRow } from "@/lib/types/domain";

export function ScannerTable({
  rows,
  selectedSymbol,
  onSelect
}: {
  rows: ScannerRow[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral">Scanner</p>
          <h2 className="text-lg font-semibold text-white">Top setups</h2>
        </div>
        <div className="text-xs text-slate-400">Click to load</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Bias</th>
              <th className="px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 6).map((row) => (
              <tr
                key={row.symbol}
                onClick={() => onSelect(row.symbol)}
                className={clsx(
                  "cursor-pointer border-t border-white/6 transition hover:bg-white/[0.04]",
                  row.symbol === selectedSymbol ? "bg-signal/10" : "bg-transparent"
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{row.symbol}</div>
                  <div className="text-xs text-neutral">{row.label}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-xs",
                      row.bias === "Bullish"
                        ? "bg-bull/15 text-bull"
                        : row.bias === "Bearish"
                          ? "bg-bear/15 text-bear"
                          : "bg-white/10 text-slate-200"
                    )}
                  >
                    {row.bias}
                  </span>
                </td>
                <td className="px-4 py-3 text-white">{row.opportunityScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
