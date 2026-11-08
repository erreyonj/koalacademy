import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test-results/koalastronomer",
);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test("Koalastronomer full UX loop: intro, touch toggle outside shell, circular bearings, ascending interval, copper telescope body, free stuck retry, and 3-ring trace solve", async ({
  page,
}) => {
  // 1. Navigate from Toolkit > Games to Koalastronomer
  await page.goto("/toolkit/games/");
  const gameLink = page.getByRole("link", { name: "Koalastronomer" });
  await expect(gameLink).toBeVisible();
  await gameLink.click();

  await expect(page).toHaveURL(/\/toolkit\/games\/koalastronomer\/?/);
  await expect(page.getByTestId("game-initializing")).toBeVisible();
  await expect(page.getByTestId("game-fullscreen")).toBeVisible();

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
  await expect(page.getByTestId("destination-cost-summary")).toContainText(
    "Cost 12 Calibration",
  );
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
  // Records collapse into a control beside the music transport, Mercury only
  await expect(page.getByTestId("records-count")).toHaveText("0 / 4");
  await page.getByTestId("records-toggle").click();
  const popover = page.getByTestId("records-popover");
  await expect(popover).toContainText("Mercury");
  await expect(popover.getByRole("option")).toHaveCount(4);
  await expect(page.getByTestId("challenge-card-badge-1")).toHaveCount(0);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "02a-records-popover.png"),
    animations: "disabled",
  });
  await page.getByTestId("challenge-card-beef-1").click();
  await expect(popover).toHaveCount(0);

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

  // 5. Seed 20 Calibration points on Easy, verify Briefing, Rules modal, copper body, and trace puzzles
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
        telescopeProgress: null,
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("points-display")).toHaveText("20");
  await page.getByTestId("destination-mercury-sector").click();
  await page.getByTestId("begin-observation").click();

  // Lands on Telescope Briefing first
  await expect(page.getByTestId("telescope-briefing-screen")).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "03-telescope-briefing.png"),
  });
  await page.getByTestId("begin-calibration-btn").click();
  await expect(page.getByTestId("telescope-screen")).toBeVisible();
  await expect(page.getByTestId("telescope-body")).toBeVisible();
  await expect(page.getByTestId("rings-solved-pill")).toHaveText(
    "0 / 3 Rings Aligned",
  );
  await expect(page.getByTestId("lens-view")).toHaveAttribute(
    "data-solved",
    "0",
  );
  await expect(page.getByTestId("movement-budget-status")).toHaveCount(0);
  await expect(page.getByTestId("trace-cost-rule")).toContainText(
    "Failed traces are free",
  );

  // Open and close the outer Rules toggle during calibration
  await page.getByTestId("telescope-rules-toggle").click();
  await expect(page.getByTestId("telescope-rules-modal")).toBeVisible();
  await page.getByTestId("close-telescope-rules-btn").click();
  await expect(page.getByTestId("telescope-rules-modal")).toHaveCount(0);

  // 6. Open Range ring cog, verify Easy's single first-dial line hint, trigger a stuck trace for free, then solve all 3 rings
  await page.getByTestId("cog-ring-range").click();
  await expect(page.getByTestId("trace-puzzle-card")).toHaveAttribute(
    "data-ring",
    "range",
  );
  const lineHint = page.getByTestId("trace-first-line-hint");
  await expect(lineHint).toHaveCount(1);
  await expect(page.getByTestId("trace-follow-line-banner")).toContainText(
    "FOLLOW THIS LINE",
  );
  const hintFrom = await lineHint.getAttribute("data-from");
  await expect(page.getByTestId(`trace-start-glow-${hintFrom}`)).toBeVisible();
  await expect(page.locator('[data-testid^="trace-start-glow-"]')).toHaveCount(
    1,
  );

  // Dead-end attempt: b -> a gets stuck with 1 / 4 lines and spends 0 Calibration
  await page.getByTestId("trace-node-b").click();
  await page.getByTestId("trace-node-a").click();
  await expect(page.getByTestId("trace-line-counter")).toHaveText(
    "1 / 4 lines",
  );
  await expect(page.getByTestId("trace-stuck-banner")).toContainText(
    "Stuck - try a different start",
  );
  await expect(page.getByTestId("points-display")).toHaveText("20");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "04-telescope-trace-puzzle.png"),
  });

  // Clear and solve Range: a -> b -> c -> d -> b (4 lines, -4 Calibration -> 16)
  await page.getByTestId("trace-clear-btn").click();
  for (const nodeId of ["a", "b", "c", "d", "b"]) {
    await page.getByTestId(`trace-node-${nodeId}`).click();
  }
  await expect(page.getByTestId("points-display")).toHaveText("16");
  await expect(page.getByTestId("cog-status-range")).toHaveText("Aligned ✓");
  await expect(page.getByTestId("rings-solved-pill")).toHaveText(
    "1 / 3 Rings Aligned",
  );

  // Solve Focus: d -> c -> a -> b -> c (4 lines, -4 Calibration -> 12)
  await page.getByTestId("cog-ring-focus").click();
  await expect(page.getByTestId("trace-first-line-hint")).toHaveCount(0);
  await expect(page.getByTestId("trace-follow-line-banner")).toHaveCount(0);
  for (const nodeId of ["d", "c", "a", "b", "c"]) {
    await page.getByTestId(`trace-node-${nodeId}`).click();
  }
  await expect(page.getByTestId("points-display")).toHaveText("12");
  await expect(page.getByTestId("cog-status-focus")).toHaveText("Aligned ✓");

  // Solve Alignment: a -> b -> c -> d -> a (4 lines, -4 Calibration -> 8)
  await page.getByTestId("cog-ring-alignment").click();
  for (const nodeId of ["a", "b", "c", "d", "a"]) {
    await page.getByTestId(`trace-node-${nodeId}`).click();
  }

  await expect(page.getByTestId("observation-success")).toBeVisible();
  await expect(page.getByTestId("observation-continue-btn")).toHaveCount(0);
  await expect(page.getByTestId("lens-view")).toHaveAttribute(
    "data-solved",
    "3",
  );
  await expect(page.getByTestId("points-display")).toHaveText("8");
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "04-telescope-success.png"),
  });

  // 7. Reload and verify region stays revealed and Calibration spend persisted
  await page.reload();
  await expect(page.getByTestId("points-display")).toHaveText("8");
  await expect(page.getByTestId("completed-observations")).toHaveText("1");
  await expect(page.getByTestId("star-map")).toHaveAttribute(
    "data-revealed",
    /mercury-sector/,
  );

  // 8. A charted sector can be revisited for its sector log
  await page.getByTestId("destination-mercury-sector").click();
  await expect(page.getByTestId("begin-observation")).toHaveCount(0);
  await page.getByTestId("view-sector-log-btn").click();
  await expect(page.getByTestId("sector-log")).toContainText("Mercury");
  // The charted sector's lens takes the star chart's place while the log is open
  await expect(page.getByTestId("star-map")).toHaveCount(0);
  await expect(
    page.getByTestId("atlas-sector-lens").getByTestId("lens-view"),
  ).toHaveAttribute("data-solved", "3");
  const logScroll = page.getByTestId("sector-log-scroll");
  expect(
    await logScroll.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "05-sector-log.png"),
    animations: "disabled",
  });
});

test("Insufficient Calibration shows 'Needs N Calibration' on ring cogs and links to Archive", async ({
  page,
}) => {
  await page.goto("/toolkit/games/koalastronomer/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "telescope",
        difficulty: "hard",
        calibrationPoints: 2,
        completedChallengeIds: [],
        completedDestinationIds: [],
        currentDestinationId: "mercury-sector",
        telescopeProgress: {
          destinationId: "mercury-sector",
          solved: { range: false, focus: false, alignment: false },
          stuckCounts: { range: 0, focus: 0, alignment: 0 },
        },
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("telescope-screen")).toBeVisible();
  await expect(page.getByTestId("cog-status-range")).toHaveText(
    "Needs 8 Calibration",
  );
  await expect(page.getByTestId("cog-archive-link-range")).toBeVisible();
  await expect(page.getByTestId("out-of-points-banner")).toBeVisible();
});

test("Hard mode charges 1 Calibration per failed or abandoned trace", async ({
  page,
}) => {
  await page.goto("/toolkit/games/koalastronomer/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "telescope",
        difficulty: "hard",
        calibrationPoints: 20,
        completedChallengeIds: [],
        completedDestinationIds: [],
        currentDestinationId: "mercury-sector",
        telescopeProgress: {
          destinationId: "mercury-sector",
          solved: { range: false, focus: false, alignment: false },
          stuckCounts: { range: 0, focus: 0, alignment: 0 },
        },
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("trace-cost-rule")).toContainText(
    "Each failed trace costs 1 Calibration",
  );
  await page.getByTestId("cog-ring-range").click();

  // a -> b -> c -> a strands the trace at a (both of a's lines used)
  for (const nodeId of ["a", "b", "c", "a"]) {
    await page.getByTestId(`trace-node-${nodeId}`).click();
  }
  await expect(page.getByTestId("trace-stuck-banner")).toContainText(
    "-1 Calibration",
  );
  await expect(page.getByTestId("points-display")).toHaveText("19");

  // Clearing an already-stuck trace doesn't charge twice
  await page.getByTestId("trace-clear-btn").click();
  await expect(page.getByTestId("points-display")).toHaveText("19");

  // Abandoning a started trace counts as a failure
  await page.getByTestId("trace-node-a").click();
  await page.getByTestId("trace-node-b").click();
  await page.getByTestId("trace-clear-btn").click();
  await expect(page.getByTestId("points-display")).toHaveText("18");
});

test("Hard mode soft lock shows Game Over and resets to the intro", async ({
  page,
}) => {
  await page.goto("/toolkit/games/koalastronomer/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "atlas",
        difficulty: "hard",
        calibrationPoints: 2,
        completedChallengeIds: ["beef-1", "bed-1", "cafe-1", "added-1"],
        completedDestinationIds: [],
        currentDestinationId: null,
        telescopeProgress: null,
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("game-over-screen")).toBeVisible();
  await expect(page.getByTestId("game-over-countdown")).toContainText(
    "Restarting in",
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "06-game-over.png"),
  });
  await page.getByTestId("game-over-restart-btn").click();
  await expect(page.getByTestId("intro-screen")).toBeVisible();
  await expect(page.getByTestId("game-over-screen")).toHaveCount(0);
  await expect(page.getByTestId("difficulty-hard")).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("Easy opens a backup record set only once Calibration runs dry", async ({
  page,
}) => {
  const seed = (calibrationPoints: number) =>
    page.evaluate((points) => {
      window.localStorage.setItem(
        "koalastronomer-save",
        JSON.stringify({
          currentScreen: "archive",
          difficulty: "easy",
          calibrationPoints: points,
          completedChallengeIds: ["beef-1", "bed-1", "cafe-1", "added-1"],
          completedDestinationIds: [],
          currentDestinationId: null,
          telescopeProgress: null,
        }),
      );
    }, calibrationPoints);

  await page.goto("/toolkit/games/koalastronomer/");
  // Enough Calibration for the cheapest ring: backups stay hidden
  await seed(4);
  await page.reload();
  await expect(page.getByTestId("records-count")).toHaveText("4 / 4");
  await expect(page.getByTestId("sector-progress-badge")).toContainText(
    "Records 4 / 16",
  );

  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "archive",
        difficulty: "easy",
        calibrationPoints: 3,
        completedChallengeIds: ["beef-1", "bed-1", "cafe-1", "added-1"],
        completedDestinationIds: [],
        currentDestinationId: null,
        telescopeProgress: null,
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("records-count")).toHaveText("4 / 7");
  await expect(page.getByTestId("sector-progress-badge")).toContainText(
    "Records 4 / 19",
  );
  await page.getByTestId("records-toggle").click();
  await expect(page.getByTestId("challenge-card-ace-1")).toBeVisible();
  await expect(page.getByTestId("challenge-card-egg-1")).toHaveCount(0);
});

test("Touch mode traces a ring with one continuous slide", async ({ page }) => {
  await page.goto("/toolkit/games/koalastronomer/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "koalastronomer-save",
      JSON.stringify({
        currentScreen: "telescope",
        difficulty: "medium",
        calibrationPoints: 20,
        completedChallengeIds: [],
        completedDestinationIds: [],
        currentDestinationId: "mercury-sector",
        telescopeProgress: {
          destinationId: "mercury-sector",
          solved: { range: false, focus: false, alignment: false },
          stuckCounts: { range: 0, focus: 0, alignment: 0 },
        },
      }),
    );
  });
  await page.reload();

  await expect(page.getByTestId("koalastronomer-stage")).toHaveAttribute(
    "data-control-mode",
    "touch",
  );
  await page.getByTestId("cog-ring-range").click();
  await expect(page.getByTestId("trace-svg")).toHaveAttribute(
    "data-control-mode",
    "touch",
  );

  const centerOf = async (nodeId: string) => {
    const box = (await page.getByTestId(`trace-node-${nodeId}`).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const lineCount = await page.getByTestId("trace-line-counter").innerText();
  const total = Number(lineCount.split("/")[1].trim().split(" ")[0]);
  expect(total).toBeGreaterThan(4);

  // Find an Eulerian path for this figure from the rendered edges
  const edges = await page.$$eval('[data-testid^="trace-edge-"]', (lines) =>
    lines.map((line) => ({
      x1: Number(line.getAttribute("x1")),
      y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")),
      y2: Number(line.getAttribute("y2")),
    })),
  );
  const nodes = await page.$$eval('[data-testid^="trace-node-"]', (circles) =>
    circles.map((c) => ({
      id: c.getAttribute("data-testid")!.replace("trace-node-", ""),
      x: Number(c.getAttribute("cx")),
      y: Number(c.getAttribute("cy")),
    })),
  );
  const idAt = (x: number, y: number) =>
    nodes.find((n) => n.x === x && n.y === y)!.id;
  const adj = edges.map((e) => [idAt(e.x1, e.y1), idAt(e.x2, e.y2)]);
  const degree: Record<string, number> = {};
  for (const [a, b] of adj) {
    degree[a] = (degree[a] ?? 0) + 1;
    degree[b] = (degree[b] ?? 0) + 1;
  }
  const odd = Object.keys(degree).filter((id) => degree[id] % 2 === 1);
  const start = odd[0] ?? adj[0][0];
  const used = new Set<number>();
  const walk = (node: string, path: string[]): string[] | null => {
    if (used.size === adj.length) return path;
    for (let i = 0; i < adj.length; i += 1) {
      if (used.has(i)) continue;
      const [a, b] = adj[i];
      const next = a === node ? b : b === node ? a : null;
      if (!next) continue;
      used.add(i);
      const found = walk(next, [...path, next]);
      if (found) return found;
      used.delete(i);
    }
    return null;
  };
  const route = walk(start, [start])!;

  const first = await centerOf(route[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const nodeId of route.slice(1)) {
    const point = await centerOf(nodeId);
    await page.mouse.move(point.x, point.y, { steps: 12 });
  }
  await page.mouse.up();

  await expect(page.getByTestId("cog-status-range")).toHaveText("Aligned ✓");
});

test.describe("Fullscreen game shell", () => {
  test("Koalastronomer initializes, hides site chrome, and exits to Games", async ({
    page,
  }) => {
    await page.goto("/toolkit/games/koalastronomer/");
    await expect(page.getByTestId("game-initializing")).toContainText(
      "Initializing",
    );
    await expect(page.locator(".site-header")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-initializing.png"),
    });

    await expect(page.getByTestId("game-fullscreen")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-game-fullscreen",
      "true",
    );
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".footer")).toBeHidden();
    await expect(page.locator('[data-slot="sidebar"]')).toBeHidden();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-fullscreen.png"),
    });

    // The Next.js dev badge can sit over the bottom-left corner in dev
    await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
    await page.getByTestId("game-exit-btn").click();
    await expect(page.getByTestId("game-exit-modal")).toBeVisible();
    await page.getByTestId("game-exit-cancel").click();
    await expect(page.getByTestId("game-exit-modal")).toHaveCount(0);
    await expect(page.getByTestId("game-fullscreen")).toBeVisible();

    await page.getByTestId("game-exit-btn").click();
    await page.getByTestId("game-exit-confirm").click();
    await expect(page).toHaveURL(/\/toolkit\/games\/?$/);
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-game-fullscreen",
      "true",
    );
  });

  test("Staff DeCode initializes into fullscreen too", async ({ page }) => {
    await page.goto("/toolkit/games/staff-decode/");
    await expect(page.getByTestId("game-initializing")).toBeVisible();
    await expect(page.getByTestId("game-fullscreen")).toBeVisible();
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.getByTestId("start-game-btn")).toBeVisible();
    await expect(page.getByTestId("game-exit-btn")).toBeVisible();
  });
});
