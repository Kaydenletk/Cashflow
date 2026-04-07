import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#070b12",
        panel: "#101723",
        shell: "#151f30",
        line: "#263246",
        bull: "#1de69b",
        bear: "#ff5470",
        signal: "#35d0ff",
        gold: "#f4bf4f",
        neutral: "#8ea5bf"
      },
      boxShadow: {
        cyan: "0 0 30px rgba(53, 208, 255, 0.16)",
        gold: "0 0 30px rgba(244, 191, 79, 0.14)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
