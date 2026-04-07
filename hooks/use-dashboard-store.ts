"use client";

import { create } from "zustand";

type DashboardState = {
  selectedSymbol: string;
  scannerFilter: string;
  setSelectedSymbol: (symbol: string) => void;
  setScannerFilter: (value: string) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedSymbol: process.env.NEXT_PUBLIC_DEFAULT_SYMBOL ?? "QQQ",
  scannerFilter: "",
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol: selectedSymbol.toUpperCase() }),
  setScannerFilter: (scannerFilter) => set({ scannerFilter })
}));
