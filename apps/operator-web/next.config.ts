import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const packageDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@genesis/contracts"],
  turbopack: {
    root: join(packageDir, "../.."),
  },
};

export default nextConfig;
