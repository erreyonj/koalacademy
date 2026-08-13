import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

const pages = [
  "index",
  "materials",
  "portal",
  "songs/k-1",
  "songs/2-3",
  "songs/4-5",
  "songs/6-plus",
  "syllabi/master",
  "syllabi/grade-k",
  "syllabi/grade-1",
  "syllabi/grade-2",
  "syllabi/grade-3",
  "syllabi/grade-4",
  "syllabi/grade-5",
  "syllabi/grade-6",
  "syllabi/grade-7",
  "syllabi/grade-8",
];

export default defineConfig({
  appType: "mpa",
  build: {
    // Bundles live in /build so they never collide with the images copied
    // verbatim from public/assets.
    assetsDir: "build",
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page, resolve(root, `${page}.html`)])
      ),
    },
  },
});
