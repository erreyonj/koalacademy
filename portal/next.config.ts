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
  // .mdx is included so content/lessons and content/newsletter compile when
  // imported, but those files live outside app/ so they do not become routes.
  pageExtensions: ["ts", "tsx", "mdx"],
  // Bare hostnames only (no scheme/port) so LAN phones can load /_next in dev.
  // Include the LAN IP Next prints as "Network:" so phones can load /_next in
  // dev (HMR + client chunks). 169.254.* is link-local when DHCP is missing.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "10.64.126.12",
    "169.254.238.122",
    "::ffff:127.0.0.1",
  ],
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["vexflow"],
  // Fullscreen games pin their exit control to the bottom-left corner.
  devIndicators: { position: "top-right" },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Plugin names are passed as strings so the config stays serialisable for Turbopack.
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
