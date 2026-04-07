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
};

export default nextConfig;
