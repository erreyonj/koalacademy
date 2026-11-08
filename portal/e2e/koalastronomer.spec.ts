import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test-results/koalastronomer",
);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test("Koalastronomer full UX loop: intro, touch toggle outside shell, circular bearings, ascending interval, telescope briefing & rules, Easy 50% reset refund, and solve", async ({
  page,
}) => {
  // 1. Navigate from Toolkit > Games to Koalastronomer
  await page.goto("/toolkit/games/");
  const gameLink = page.getByRole("link", { name: "Koalastronomer" });
  await expect(gameLink).toBeVisible();
  await gameLink.click();

  await expect(page).toHaveURL(/\/toolkit\/games\/koalastronomer\/?/);

  // 2. Verify Intro screen elements & Touch Screen toggle outside .obs-shell (default ON)
  const stage = page.getByTestId("koalastronomer-stage");
  await expect(stage).toHaveAttribute("data-screen", "intro");
  await expect(stage).toHaveAttribute("data-control-mode", "touch");
  await expect(page.getByTestId("intro-screen")).toBeVisible();
  await expect(page.getByTestId("difficulty-easy")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByTestId("advanced-tools-lock")).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  const touchToggle = page.getByTestId("touch-screen-toggle");
  await expect(touchToggle).toHaveAttribute("aria-pressed", "true");
  // Confirm touch toggle lives outside .obs-shell
  const isInsideShell = await touchToggle.evaluate(
    (el) => Boolean(el.closest(".obs-shell")),
  );
  expect(isInsideShell).toBe(false);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-intro-screen.png"),
  });

  // 3. Enter Observatory -> lands on Atlas and starts Galactic Anthem
  await expect(page.getByTestId("music-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByTestId("enter-observatory-btn").click();
  await expect(stage).toHaveAttribute("data-screen", "atlas");
  await expect(page.getByTestId("atlas-screen")).toBeVisible();
  await expect(page.getByTestId("points-display")).toHaveText("0");
  await expect(page.getByTestId("music-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("music-volume").fill("0.2");
  await page.getByTestId("music-toggle").click();
  await expect(page.getByTestId("music-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  // 4. Navigate to Archive; test touch-mode swipe on circular bearing and button mode stops
  await page.getByTestId("nav-archive").click();
  await expect(page.getByTestId("archive-screen")).toBeVisible();
  await page.getByTestId("challenge-card-beef-1").click();

  // In default touch mode, stop buttons are hidden; swiping up on first bearing advances A -> B
  await expect(page.getByTestId("first-letter-B")).toHaveCount(0);
  const firstWheel = page.getByTestId("first-bearing-wheel");
  await expect(firstWheel).toHaveAttribute("data-value", "A");
  const wheelBox = (await firstWheel.boundingBox())!;
  const wcx = wheelBox.x + wheelBox.width / 2;
  const wcy = wheelBox.y + wheelBox.height / 2;
  await page.mouse.move(wcx, wcy + 20);
  await page.mouse.down();
  await page.mouse.move(wcx, wcy - 20, { steps: 5 });
  await page.mouse.up();
  await expect(firstWheel).toHaveAttribute("data-value", "B");

  // Switch to button mode via outer toggle to test wrong first letter then solve BEEF
  await touchToggle.click();
  await expect(touchToggle).toHaveAttribute("aria-pressed", "false");
  await expect(stage).toHaveAttribute("data-control-mode", "buttons");

  await page.getByTestId("first-letter-A").click();
  await page.getByTestId("second-letter-F").click();
  await page.getByTestId("submit-guess").click();

  await expect(page.getByTestId("error-message")).toContainText(
    "First letter is incorrect",
  );
  await expect(page.getByTestId("first-letter-A")).toHaveClass(/is-error/);
  await expect(page.getByTestId("points-display")).toHaveText("0");

  // Solve BEEF (missing B and F -> ascending B4 -> F5, interval 5)
  await page.getByTestId("first-letter-B").click();
  await page.getByTestId("second-letter-F").click();
  await page.getByTestId("submit-guess").click();

  await expect(page.getByTestId("interval-reward")).toContainText("5");
  await expect(page.getByTestId("interval-reward-pitches")).toContainText(
    "B4",
  );
  await expect(page.getByTestId("interval-reward-pitches")).toContainText(
    "F5",
  );
  await expect(page.getByTestId("points-display")).toHaveText("5");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-archive-bearings-solved.png"),
  });

  // 5. Seed 20 Calibration points on Easy, verify Telescope Briefing, Rules modal, and 50% Reset refund
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "atlas",
        difficulty: "easy",
        calibrationPoints: 20,
        completedChallengeIds: ["beef-1"],
        completedDestinationIds: [],
        currentDestinationId: null,
        telescopeDialState: null,
        telescopeSpentPoints: 0,
      }),
    );
  });
  await page.reload();

  // Keep button mode for deterministic dial step clicks
  await page.getByTestId("touch-screen-toggle").click();
  await expect(page.getByTestId("points-display")).toHaveText("20");
  await page.getByTestId("destination-mercury-sector").click();
  await page.getByTestId("begin-observation").click();

  // Lands on non-spoiler Telescope Briefing first
  await expect(page.getByTestId("telescope-briefing-screen")).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "03-telescope-briefing.png"),
  });
  await page.getByTestId("begin-calibration-btn").click();
  await expect(page.getByTestId("telescope-screen")).toBeVisible();

  // Open and close the outer Rules toggle during calibration
  await page.getByTestId("telescope-rules-toggle").click();
  await expect(page.getByTestId("telescope-rules-modal")).toBeVisible();
  await page.getByTestId("close-telescope-rules-btn").click();
  await expect(page.getByTestId("telescope-rules-modal")).toHaveCount(0);

  // Spend all 20 Calibration points turning Range CW 20 times, then Reset Dials on Easy -> refunds 10
  for (let i = 0; i < 20; i++) {
    await page.getByTestId("range-cw").click();
  }
  await expect(page.getByTestId("points-display")).toHaveText("0");
  await expect(page.getByTestId("reset-dials-btn")).toContainText("50% refund");
  await expect(page.getByTestId("reset-dials-btn")).toContainText("+10");
  await page.getByTestId("reset-dials-btn").click();

  // Dials reset to (0,0,0) and 10 Calibration points are refunded for a second turn
  await expect(page.getByTestId("points-display")).toHaveText("10");
  await expect(page.getByTestId("range-value")).toHaveText("0");
  await expect(page.getByTestId("focus-value")).toHaveText("0");
  await expect(page.getByTestId("alignment-value")).toHaveText("0");

  // 6. Solve Mercury Sector's 7-move path using the 10 refunded points
  await page.getByTestId("range-cw").click();
  await page.getByTestId("range-cw").click();
  await page.getByTestId("range-cw").click();
  await page.getByTestId("focus-cw").click();
  await page.getByTestId("alignment-ccw").click();
  await page.getByTestId("alignment-ccw").click();
  await page.getByTestId("alignment-ccw").click();

  await expect(page.getByTestId("observation-success")).toBeVisible();
  await expect(page.getByTestId("points-display")).toHaveText("3");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "04-telescope-success.png"),
  });

  // 7. Reload and verify region stays revealed and dial spend stuck
  await page.reload();
  await expect(page.getByTestId("points-display")).toHaveText("3");
  await expect(page.getByTestId("completed-observations")).toHaveText("1");
  await expect(page.getByTestId("star-map")).toHaveAttribute(
    "data-revealed",
    /mercury-sector/,
  );
});

test("Zero Calibration points disables telescope dial controls", async ({
  page,
}) => {
  await page.goto("/toolkit/games/koalastronomer/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "telescope",
        difficulty: "hard",
        calibrationPoints: 0,
        completedChallengeIds: [],
        completedDestinationIds: [],
        currentDestinationId: "mercury-sector",
        telescopeDialState: { range: 0, focus: 0, alignment: 0 },
        telescopeSpentPoints: 0,
      }),
    );
  });
  await page.reload();

  // Switch to button mode so the CW/CCW buttons are rendered and verified disabled
  await page.getByTestId("touch-screen-toggle").click();
  await expect(page.getByTestId("telescope-screen")).toBeVisible();
  await expect(page.getByTestId("range-cw")).toBeDisabled();
  await expect(page.getByTestId("range-ccw")).toBeDisabled();
  await expect(page.getByTestId("focus-cw")).toBeDisabled();
  await expect(page.getByTestId("alignment-cw")).toBeDisabled();
  await expect(page.getByTestId("out-of-points-banner")).toBeVisible();
});
