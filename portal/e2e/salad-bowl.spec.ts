import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * One teacher + three students, each in an isolated browser context (its own
 * anonymous session and localStorage), through create → join → cards →
 * moderation → teams → a played turn → pause → reconnect → clear.
 *
 * Requires the local Supabase stack, the salad-bowl Edge Function, and the
 * dev server (see playwright.config.ts). Skipped unless SB_E2E=1.
 */
test.skip(process.env.SB_E2E !== "1", "Set SB_E2E=1 with the local stack running");

const GAME_URL = "/toolkit/games/salad-bowl/";
const STUDENTS = ["Maya", "Leo", "Zoe"] as const;

async function newDevice(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(GAME_URL);
  return { context, page };
}

async function joinAs(page: Page, code: string, name: string) {
  await page.getByRole("tab", { name: "Join a game" }).click();
  await page.getByLabel(/game code/i).fill(code);
  await page.getByLabel(/first name/i).fill(name);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("You're in!")).toBeVisible();
}

test("full classroom flow", async ({ browser }) => {
  const devices: { context: BrowserContext; page: Page }[] = [];

  // --- Teacher creates a free-for-all game -------------------------------
  const teacher = await newDevice(browser);
  devices.push(teacher);
  await teacher.page.getByRole("tab", { name: "Host (teacher)" }).click();
  await teacher.page.getByRole("button", { name: "Create game" }).click();
  const codeEl = teacher.page.locator(".sb-code");
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{5}$/);

  // --- Students join ------------------------------------------------------
  for (const name of STUDENTS) {
    const device = await newDevice(browser);
    devices.push(device);
    await joinAs(device.page, code, name);
    // Lobby shows the roster live on the teacher device.
    await expect(teacher.page.getByText(name)).toBeVisible();
  }

  // Duplicate name is refused with a friendly message.
  const dupe = await newDevice(browser);
  await dupe.page.getByLabel(/game code/i).fill(code);
  await dupe.page.getByLabel(/first name/i).fill("maya");
  await dupe.page.getByRole("button", { name: "Join" }).click();
  await expect(dupe.page.getByText(/name is taken/i)).toBeVisible();
  await dupe.context.close();

  // --- Response collection ------------------------------------------------
  await teacher.page
    .getByRole("button", { name: "Open the bowl for cards" })
    .click();

  const cards: Record<string, string[]> = {
    Maya: ["air guitar", "kick drum"],
    Leo: ["chorus", "quarter note"],
    Zoe: ["koala sampler", "808 bass"],
  };
  for (const [i, name] of STUDENTS.entries()) {
    const page = devices[i + 1].page;
    for (const card of cards[name]) {
      await page.getByLabel(/write a card/i).fill(card);
      await page.getByRole("button", { name: "Drop it in the bowl" }).click();
    }
    await expect(page.getByText("All your cards are in.")).toBeVisible();
  }

  const zoe = devices[3].page;

  // --- Teacher locks and reviews -----------------------------------------
  // (Duplicate/banned submission handling is covered end-to-end in the DB
  // suite; here we verify the happy moderation path.)
  await expect(
    teacher.page.getByText("3 of 3 players have all their cards in."),
  ).toBeVisible();
  await teacher.page.getByRole("button", { name: "Lock the bowl" }).click();
  await teacher.page
    .getByRole("button", { name: "Approve all waiting" })
    .click();
  await expect(teacher.page.getByText(/In the bowl \(6\)/)).toBeVisible();

  // --- Teams --------------------------------------------------------------
  await teacher.page.getByRole("button", { name: "Draw teams" }).click();
  await expect(teacher.page.getByText("Team 1")).toBeVisible();
  await teacher.page
    .getByRole("button", { name: "Lock teams & play" })
    .click();
  await expect(teacher.page.getByText("Round 1 — Describe")).toBeVisible();

  // Students see the round intro too (realtime propagation).
  await expect(zoe.getByText("Round 1 — Describe")).toBeVisible();

  // --- A played turn ------------------------------------------------------
  await teacher.page.getByRole("button", { name: "Start Round 1" }).click();

  // Whichever student is up sees the start button; find them.
  let activePage: Page | null = null;
  for (const device of devices.slice(1)) {
    if (
      await device.page
        .getByRole("button", { name: "Start my turn" })
        .isVisible()
        .catch(() => false)
    ) {
      activePage = device.page;
      break;
    }
  }
  expect(activePage, "one student should be up").not.toBeNull();
  await activePage!.getByRole("button", { name: "Start my turn" }).click();

  // Active player sees a clue; a spectator does not see the clue text.
  const clue = activePage!.locator(".sb-clue");
  await expect(clue).toBeVisible();
  const clueText = (await clue.innerText()).trim();
  expect(Object.values(cards).flat()).toContain(clueText);
  const spectator = devices.slice(1).find((d) => d.page !== activePage)!.page;
  await expect(spectator.locator(".sb-clue")).toHaveCount(0);
  await expect(spectator.getByText("is giving clues")).toBeVisible();

  // Score one, pass one (pass button then disables).
  await activePage!.getByRole("button", { name: /Got it/ }).click();
  await activePage!.getByRole("button", { name: /^Pass \(1\)/ }).click();
  await expect(
    activePage!.getByRole("button", { name: "Pass used" }),
  ).toBeDisabled();

  // --- Master pause -------------------------------------------------------
  await teacher.page.getByRole("button", { name: "Pause" }).click();
  await expect(spectator.getByText("Paused")).toBeVisible();
  await expect(activePage!.getByRole("button", { name: /Got it/ })).toBeDisabled();
  await teacher.page.getByRole("button", { name: "Resume" }).click();
  await expect(activePage!.getByRole("button", { name: /Got it/ })).toBeEnabled();

  // --- Refresh / reconnect mid-turn --------------------------------------
  await activePage!.reload();
  // The stored seat rejoins automatically and the clue is restored via the
  // active-card RLS read.
  await expect(activePage!.locator(".sb-clue")).toBeVisible({ timeout: 15000 });
  await expect(activePage!.getByRole("button", { name: /Got it/ })).toBeVisible();

  // Teacher ends the turn from the control bar.
  await teacher.page.getByRole("button", { name: "End turn" }).click();
  await expect(teacher.page.getByText(/Up next:/)).toBeVisible();

  // --- Clear bowl ---------------------------------------------------------
  await teacher.page.getByRole("button", { name: "Clear bowl" }).click();
  await teacher.page
    .getByRole("button", { name: "Clear everything" })
    .click();
  await expect(teacher.page.getByText("Join code")).toBeVisible();
  // Students land back in the lobby, still joined.
  await expect(zoe.getByText("You're in!")).toBeVisible({ timeout: 15000 });

  for (const device of devices) await device.context.close();
});
