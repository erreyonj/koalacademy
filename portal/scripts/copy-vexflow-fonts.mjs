#!/usr/bin/env node
/**
 * Copy Bravura + Academico woff2 from @vexflow-fonts into public/fonts/vexflow
 * so notation can load same-origin fonts under Netlify CSP (font-src 'self' data:).
 *
 * Runs as predev / prebuild so next always has the files without committing binaries.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(portalRoot, "public", "fonts", "vexflow");

const fonts = [
  { pkg: "@vexflow-fonts/bravura", file: "bravura.woff2", destDir: "bravura" },
  { pkg: "@vexflow-fonts/academico", file: "academico.woff2", destDir: "academico" },
];

for (const { pkg, file, destDir } of fonts) {
  const pkgJson = require.resolve(`${pkg}/package.json`);
  const src = path.join(path.dirname(pkgJson), file);
  if (!fs.existsSync(src)) {
    console.error(`copy-vexflow-fonts: missing ${src}`);
    process.exit(1);
  }
  const destFolder = path.join(outRoot, destDir);
  fs.mkdirSync(destFolder, { recursive: true });
  const dest = path.join(destFolder, file);
  fs.copyFileSync(src, dest);
  console.log(`copy-vexflow-fonts: ${pkg}/${file} → ${path.relative(portalRoot, dest)}`);
}
