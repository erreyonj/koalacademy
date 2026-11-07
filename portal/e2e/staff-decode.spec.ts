import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test-results/staff-decode",
);

test("Staff DeCode full game loop: start, cipher, wrong pitch, wrong value, clear room, door transition, win", async ({
  page,
}) => {
  // 1. Navigate from Toolkit > Games to Staff DeCode
  await page.goto("/toolkit/games/");
  const staffDecodeLink = page.getByRole("link", { name: "Staff DeCode" });
  await expect(staffDecodeLink).toBeVisible();
  await staffDecodeLink.click();

  await expect(page).toHaveURL(/\/toolkit\/games\/staff-decode\/?/);

  // 2. Verify Start screen elements
  const stage = page.getByTestId("staff-decode-stage");
  await expect(stage).toHaveAttribute("data-phase", "start");
  await expect(page.getByTestId("advanced-tools-lock")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByTestId("difficulty-easy")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByTestId("touch-screen-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "01-start-screen.png"),
  });

  // 3. Enter Room 1 on Easy; the theme starts with the game and can be paused
  await expect(page.getByTestId("music-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByTestId("start-game-btn").click();
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
  await expect(stage).toHaveAttribute("data-phase", "room");
  await expect(page.getByTestId("room-progress-badge")).toContainText(
    "Room 1 / 5",
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02-room-closed-safe.png"),
  });

  // 4. Click safe door to open dial
  await page.getByTestId("safe-door-hotspot").click();
  await expect(stage).toHaveAttribute("data-phase", "dial");

  // Wait for cipher scramble to finish (620ms)
  await page.waitForTimeout(750);

  const activeLetter = page.getByTestId("active-code-letter");
  await expect(activeLetter).toBeVisible();

  const firstTargetPitch = await activeLetter.getAttribute("data-target-pitch");
  const firstTargetDuration = await activeLetter.getAttribute(
    "data-target-duration",
  );
  expect(firstTargetPitch).toBeTruthy();
  expect(firstTargetDuration).toBeTruthy();

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "03-dial-closeup.png"),
  });
  await expect(
    page.locator('[data-testid="live-staff-card"] .notation-staff-host svg'),
  ).toBeVisible();
  await expect(page.getByTestId("dial-hand")).toBeVisible();
  await page.getByTestId("touch-screen-toggle").click();
  await expect(page.getByTestId("dial-up-btn")).toBeVisible();
  await expect(page.getByTestId("steth-down-btn")).toBeVisible();
  await expect(page.getByTestId("dial-hand")).toHaveCount(0);
  await page.getByTestId("touch-screen-toggle").click();

  // Without a dial move the smart timer never fires, even on a stethoscope change
  await page.getByTestId("steth-option-8").click();
  await page.getByTestId("steth-option-q").click();
  await page.waitForTimeout(950);
  await expect(page.getByTestId("active-code-letter")).toHaveAttribute(
    "data-target-pitch",
    firstTargetPitch!,
  );
  await expect(page.getByTestId("dial-status-pill")).not.toContainText(
    "Wrong",
  );

  // 5. Trigger a wrong-pitch check and confirm error feedback + letter stays
  const wrongPitch = firstTargetPitch === "F4" ? "G4" : "F4";
  await page.getByTestId(`dial-stop-${wrongPitch}`).click({ force: true });
  await expect(page.getByTestId("safe-dial-wheel")).toHaveAttribute(
    "data-selected-pitch",
    wrongPitch,
  );
  await page.waitForTimeout(950);
  await expect(page.getByTestId("dial-status-pill")).toContainText(
    "Wrong pitch",
  );
  await expect(page.getByTestId("safe-dial-wheel")).toHaveClass(
    /is-error-pitch/,
  );

  // 6. Trigger a wrong-value (subdivision) check: exact pitch, wrong stethoscope duration
  const wrongDuration = firstTargetDuration === "q" ? "8" : "q";
  await page.getByTestId(`dial-stop-${firstTargetPitch}`).click({ force: true });
  await expect(page.getByTestId("safe-dial-wheel")).toHaveAttribute(
    "data-selected-pitch",
    firstTargetPitch!,
  );
  await page.getByTestId(`steth-option-${wrongDuration}`).click();
  await page.waitForTimeout(950);
  await expect(page.getByTestId("dial-status-pill")).toContainText(
    "Right pitch! Match",
  );
  await expect(page.getByTestId("stethoscope-selector")).toHaveClass(
    /is-error-value/,
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "04-subdivision-error.png"),
  });

  // 7. Solve all 5 rooms to reach the Win screen
  const liveStaffNotes = page.locator(
    '[data-testid="live-staff-card"] .vf-stavenote',
  );
  for (let roomIdx = 0; roomIdx < 5; roomIdx++) {
    if (roomIdx > 0) {
      await expect(stage).toHaveAttribute("data-phase", "room");
      await expect(page.getByTestId("room-progress-badge")).toContainText(
        `Room ${roomIdx + 1} / 5`,
      );
      await page.getByTestId("safe-door-hotspot").click();
      await expect(stage).toHaveAttribute("data-phase", "dial");
      await page.waitForTimeout(750);
    }

    // Solve letters until phase becomes door-open
    for (let step = 0; step < 8; step++) {
      const currentPhase = await stage.getAttribute("data-phase");
      if (currentPhase === "door-open") break;

      const letterEl = page.getByTestId("active-code-letter");
      const targetPitch = await letterEl.getAttribute("data-target-pitch");
      const targetDuration = await letterEl.getAttribute(
        "data-target-duration",
      );
      if (!targetPitch || !targetDuration) break;

      if (roomIdx === 0) {
        await expect(liveStaffNotes).toHaveCount(step + 1);
      }

      await page.getByTestId(`dial-stop-${targetPitch}`).click({ force: true });
      await expect(page.getByTestId("safe-dial-wheel")).toHaveAttribute(
        "data-selected-pitch",
        targetPitch,
      );
      await page.getByTestId(`steth-option-${targetDuration}`).click();
      await page.waitForTimeout(950);
    }

    await expect(stage).toHaveAttribute("data-phase", "door-open");
    const doorway = page.getByTestId("open-doorway-hotspot");
    if (roomIdx === 0) {
      await expect(doorway).toBeDisabled();
      const solvedCard = page.getByTestId("solved-staff-card");
      const word = (await solvedCard.getAttribute("data-word")) ?? "";
      expect(word.length).toBeGreaterThanOrEqual(3);
      await expect(solvedCard.locator(".vf-stavenote")).toHaveCount(
        word.length,
      );
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "05-door-open.png"),
      });
    }
    await expect(doorway).toBeEnabled({ timeout: 6000 });
    await expect(page.getByTestId("solved-staff")).toHaveClass(/is-faded/);
    await doorway.click();
    await page.waitForTimeout(500);
  }

  // 8. Confirm Win vault screen
  await expect(stage).toHaveAttribute("data-phase", "win");
  await expect(page.getByTestId("win-screen")).toContainText("Vault Unlocked");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "06-win-vault.png"),
  });

  // 9. Switch to Hard mode and verify ledger-line range + countdown clock
  await page.getByRole("button", { name: "Change Difficulty" }).click();
  await page.getByTestId("difficulty-hard").click();
  await page.getByTestId("start-game-btn").click();
  await page.getByTestId("safe-door-hotspot").click();
  await page.waitForTimeout(750);
  await expect(page.getByTestId("dial-stop-A3")).toBeVisible();
  await expect(page.getByTestId("dial-stop-A3")).toHaveText("");
  await expect(page.getByTestId("dial-stop-C6")).toBeVisible();
  await expect(page.getByTestId("steth-option-16")).toBeVisible();
  await expect(page.getByTestId("steth-option-w")).toBeVisible();
  await expect(page.getByTestId("game-clock")).toContainText("LOCK IN");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "07-hard-mode-dial.png"),
  });
});
