import { defineConfig, devices } from "@playwright/test";

/**
 * Multi-device classroom E2E. Needs the full stack running first:
 *
 *   npx supabase start && npx supabase db reset --local
 *   npx supabase functions serve salad-bowl
 *   npm run dev            (with .env pointed at the local stack)
 *   npm run test:e2e
 *
 * See docs/salad-bowl-v1.md for the local-stack env values.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  // One classroom, one game code — contexts must share the flow in order.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.SB_E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["iPad (gen 7)"],
  },
});
