import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test-results/notation-scroll",
);

const ORIENTATIONS = [
  { name: "portrait", viewport: { width: 810, height: 1080 } },
  { name: "landscape", viewport: { width: 1080, height: 810 } },
] as const;

/** Distance (px) the #main scroller may differ from the expected target. */
const SCROLL_TOLERANCE = 2;

function control(page: Page, eyebrow: string) {
  return page.locator(".notation-control", {
    has: page.getByText(eyebrow, { exact: true }),
  });
}

async function openSpelling(page: Page) {
  await page.goto("/tools/notation/");
  await expect(page.getByTestId("notation-staff")).toBeVisible();
  await expect(page.locator(".notation-staff-host svg")).toBeVisible();
  await control(page, "Activity").getByRole("button").click();
  await page.getByRole("menuitemradio", { name: "Spelling" }).click();
  await expect(page.locator(".notation-stage.has-spelling")).toBeVisible();
  await expect(page.locator(".notation-staff-host svg")).toBeVisible();
}

async function systemCount(page: Page) {
  return Number(
    await page.getByTestId("notation-staff").getAttribute("data-system-count"),
  );
}

async function scrollState(page: Page) {
  return page.evaluate(() => {
    const main = document.getElementById("main")!;
    return {
      top: main.scrollTop,
      max: main.scrollHeight - main.clientHeight,
    };
  });
}

/** Put the sandbox at the top of #main — the same framing the reset uses. */
async function frameSandbox(page: Page) {
  await page.evaluate(() => {
    const main = document.getElementById("main")!;
    const sandbox = document.querySelector<HTMLElement>(
      '[data-testid="notation-sandbox"]',
    )!;
    const offset =
      sandbox.getBoundingClientRect().top -
      main.getBoundingClientRect().top +
      main.scrollTop;
    main.scrollTop = Math.max(0, offset - 12);
  });
  await page.waitForTimeout(150);
}

async function staveBox(page: Page, index: number) {
  const box = await page.locator(".notation-staff .vf-stave").nth(index).boundingBox();
  expect(box, `stave ${index} has a box`).not.toBeNull();
  return box!;
}

async function mainBox(page: Page) {
  const box = await page.locator("#main").boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/** Tap an empty spot at the right end of the stave that is on screen. */
async function tapNewNote(page: Page, noteCount: number) {
  const staveIndex = noteCount >= 4 && (await systemCount(page)) >= 2 ? 1 : 0;
  const box = await staveBox(page, staveIndex);
  await page.touchscreen.tap(box.x + box.width - 6, box.y + box.height / 2);
}

async function tapNotes(page: Page, from: number, to: number) {
  for (let n = from; n < to; n += 1) {
    await tapNewNote(page, n);
    await expect(page.locator(".notation-staff .vf-notehead")).toHaveCount(n + 1);
    await page.waitForTimeout(80);
  }
}

async function expectScrollAtBottom(page: Page) {
  await expect
    .poll(
      async () => {
        const { top, max } = await scrollState(page);
        return Math.abs(top - max) <= SCROLL_TOLERANCE;
      },
      { timeout: 5000 },
    )
    .toBe(true);
}

async function expectBar2Visible(page: Page) {
  const main = await mainBox(page);
  const bar2 = await staveBox(page, 1);
  expect(bar2.y).toBeGreaterThanOrEqual(main.y - 1);
  expect(bar2.y + bar2.height).toBeLessThanOrEqual(main.y + main.height + 1);
}

async function expectBar1Framed(page: Page, startTop: number) {
  await expect
    .poll(async () => Math.abs((await scrollState(page)).top - startTop), {
      timeout: 4000,
    })
    .toBeLessThanOrEqual(SCROLL_TOLERANCE);
  const main = await mainBox(page);
  const toolbar = await page.getByRole("toolbar", { name: "Staff settings" }).boundingBox();
  expect(toolbar!.y).toBeGreaterThanOrEqual(main.y - 1);
  const footerPad = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.getElementById("main")!).paddingBottom),
  );
  const bar1 = await staveBox(page, 0);
  expect(bar1.y + bar1.height).toBeLessThanOrEqual(
    main.y + main.height - footerPad + 1,
  );
}

async function doubleTapNote(page: Page, index: number) {
  const head = await page.locator(".notation-staff .vf-notehead").nth(index).boundingBox();
  expect(head).not.toBeNull();
  const x = head!.x + head!.width / 2;
  const y = head!.y + head!.height / 2;
  await page.touchscreen.tap(x, y);
  await page.touchscreen.tap(x, y);
}

for (const { name, viewport } of ORIENTATIONS) {
  test.describe(`notation staff scroll (${name})`, () => {
    test.use({ viewport });

    test("presses do not scroll; bar 2 scrolls down, clearing it scrolls back", async ({
      page,
    }) => {
      await openSpelling(page);
      await frameSandbox(page);
      const start = await scrollState(page);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}-01-start.png`) });

      // Notes 1-4 stay on bar 1 — the page must not move.
      await tapNotes(page, 0, 4);
      expect(await systemCount(page)).toBe(1);
      expect(Math.abs((await scrollState(page)).top - start.top)).toBeLessThanOrEqual(
        SCROLL_TOLERANCE,
      );
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}-02-four-notes.png`),
      });

      // Note 5 creates bar 2 and scrolls it into view.
      await tapNotes(page, 4, 5);
      await expect(page.getByTestId("notation-staff")).toHaveAttribute(
        "data-system-count",
        "2",
      );
      await expectScrollAtBottom(page);
      await expectBar2Visible(page);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}-03-bar2-scrolled.png`),
      });

      // Notes 6-8 land on bar 2 — no further scrolling.
      const atBar2 = await scrollState(page);
      await tapNotes(page, 5, 8);
      expect(await systemCount(page)).toBe(2);
      expect(Math.abs((await scrollState(page)).top - atBar2.top)).toBeLessThanOrEqual(
        SCROLL_TOLERANCE,
      );

      // Delete everything on bar 2 (double-tap the 5th note four times).
      for (let remaining = 8; remaining > 4; remaining -= 1) {
        await doubleTapNote(page, 4);
        await expect(page.locator(".notation-staff .vf-notehead")).toHaveCount(
          remaining - 1,
        );
        await page.waitForTimeout(120);
      }
      await expect(page.getByTestId("notation-staff")).toHaveAttribute(
        "data-system-count",
        "1",
      );
      await expectBar1Framed(page, start.top);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}-04-bar2-cleared.png`),
      });
    });

    test("Erase empties bar 2 and returns to bar 1", async ({ page }) => {
      await openSpelling(page);
      await frameSandbox(page);
      const start = await scrollState(page);

      await tapNotes(page, 0, 5);
      await expect(page.getByTestId("notation-staff")).toHaveAttribute(
        "data-system-count",
        "2",
      );
      await expectScrollAtBottom(page);

      await control(page, "Erase").getByRole("button", { name: "Erase" }).click();
      await expect(page.getByTestId("notation-staff")).toHaveAttribute(
        "data-system-count",
        "1",
      );
      await expectBar1Framed(page, start.top);
    });

    test("Generate > Random shows bar 2 when it needs one and Erase returns", async ({
      page,
    }) => {
      await openSpelling(page);
      await frameSandbox(page);
      const start = await scrollState(page);

      // Random words are 3-8 letters; keep generating until one needs bar 2.
      let twoBars = false;
      for (let attempt = 0; attempt < 25 && !twoBars; attempt += 1) {
        await control(page, "Generate").getByRole("button").click();
        await page.getByRole("menuitem", { name: "Random" }).click();
        await page.waitForTimeout(200);
        twoBars = (await systemCount(page)) >= 2;
        if (twoBars) await expectScrollAtBottom(page);
        else {
          // A short word keeps the page framed on bar 1.
          expect(
            Math.abs((await scrollState(page)).top - start.top),
          ).toBeLessThanOrEqual(SCROLL_TOLERANCE);
        }
      }
      expect(twoBars, "Random generated a 5+ letter word").toBe(true);
      await expectBar2Visible(page);

      await control(page, "Erase").getByRole("button", { name: "Erase" }).click();
      await expect(page.getByTestId("notation-staff")).toHaveAttribute(
        "data-system-count",
        "1",
      );
      await expectBar1Framed(page, start.top);
    });
  });
}
