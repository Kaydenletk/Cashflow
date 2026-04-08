import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this directory. There are other
  // package-lock.json files higher up the tree (parent Desktop folder), and
  // without this Next would emit a "multiple lockfiles detected" warning and
  // potentially infer the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Don't bundle pdf-parse / pdfjs-dist into the server build. Turbopack
  // struggles with the pdfjs-dist worker chunk (.next/dev/server/chunks/
  // pdf.worker.mjs is never emitted), producing a "Setting up fake worker
  // failed" error at runtime. Listing them as external packages makes Node
  // resolve them from node_modules at request time, where the worker path
  // is valid and the loader works normally.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
