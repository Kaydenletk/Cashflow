"use client";

import { useEffect, useId, useRef } from "react";

export function TradingViewTile({
  symbol = "CME_MINI:NQ1!"
}: {
  symbol?: string;
}) {
  const containerId = useId().replace(/:/g, "-");
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    host.innerHTML = [
      `<div class="tradingview-widget-container" style="height:100%;width:100%">`,
      `<div id="${containerId}" class="tradingview-widget-container__widget" style="height:calc(100% - 28px);width:100%"></div>`,
      `<div class="tradingview-widget-copyright" style="padding-top:10px;font-size:12px;color:#6b7280">`,
      `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:#6b7280">Market data by TradingView</a>`,
      `</div>`,
      `</div>`
    ].join("");

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      lineWidth: 2,
      lineType: 0,
      chartType: "area",
      fontColor: "rgb(106, 109, 120)",
      gridLineColor: "rgba(46, 46, 46, 0.06)",
      volumeUpColor: "rgba(34, 171, 148, 0.5)",
      volumeDownColor: "rgba(247, 82, 95, 0.5)",
      backgroundColor: "#ffffff",
      widgetFontColor: "#0F0F0F",
      upColor: "#22ab94",
      downColor: "#f7525f",
      borderUpColor: "#22ab94",
      borderDownColor: "#f7525f",
      wickUpColor: "#22ab94",
      wickDownColor: "#f7525f",
      colorTheme: "light",
      isTransparent: false,
      locale: "en",
      chartOnly: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      valuesTracking: "1",
      changeMode: "price-and-percent",
      symbols: [
        ["Nasdaq Futures", `${symbol}|15`],
        ["S&P Futures", "CME_MINI:ES1!|15"],
        ["Bitcoin", "BITSTAMP:BTCUSD|60"],
        ["Microsoft", "NASDAQ:MSFT|1D"]
      ],
      dateRanges: ["1d|15", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      fontSize: "10",
      headerFontSize: "medium",
      autosize: true,
      width: "100%",
      height: "100%",
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      support_host: "https://www.tradingview.com"
    });

    host.firstElementChild?.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, [containerId, symbol]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral">TradingView Feed</p>
          <h2 className="text-lg font-semibold text-white">Diversified market board</h2>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          NQ1! anchor
        </div>
      </div>
      <div className="h-[420px] overflow-hidden rounded-3xl border border-white/8 bg-white shadow-[0_10px_30px_rgba(255,255,255,0.04)]">
        <div ref={hostRef} className="h-full w-full" />
      </div>
    </section>
  );
}
