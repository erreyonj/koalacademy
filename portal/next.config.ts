import path from "node:path";
import { fileURLToPath } from "node:url";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin Turbopack to this app so a lockfile at the repo root is not treated
  // as the workspace root.
  turbopack: { root: dir },
  // Static HTML export: no server runtime, so Netlify hosting stays identical
  // to the marketing site's zero-cost static deploy.
  output: "export",
  // .mdx is included so content/lessons/*.mdx are compiled when imported,
  // but those files live outside app/ so they do not become routes.
  pageExtensions: ["ts", "tsx", "mdx"],
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["vexflow"],
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Plugin names are passed as strings so the config stays serialisable for Turbopack.
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
