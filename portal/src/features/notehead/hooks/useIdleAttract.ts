"use client";

import { useEffect, type RefObject } from "react";
import { playIdleFlash, stopIdleFlash } from "../modules/audio";

const IDLE_MS = 12_000;
/** Whole chrome pass completes in about this long, then attract stops. */
const FLASH_PASS_MS = 1300;

/**
 * After `IDLE_MS` without pointer/key activity, walk `[data-idle-flash]`
 * targets in DOM order once (~`FLASH_PASS_MS`), then clear and re-arm idle.
 * Any activity clears the attract and re-arms the idle timer.
 */
export function useIdleAttract(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let idleTimer = 0;
    let flashTimer = 0;
    let index = 0;
    let targets: HTMLElement[] = [];

    const clearFlash = () => {
      for (const el of targets) el.classList.remove("is-idle-flash");
    };

    const stopAttract = () => {
      if (flashTimer) {
        window.clearInterval(flashTimer);
        flashTimer = 0;
      }
      clearFlash();
      root.classList.remove("is-idle-attract");
      stopIdleFlash();
    };

    const armIdle = () => {
      stopAttract();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(startAttract, IDLE_MS);
    };

    const stepFlash = () => {
      if (targets.length === 0) {
        armIdle();
        return;
      }
      clearFlash();
      if (index >= targets.length) {
        // One full pass done — sleep until the next idle window.
        armIdle();
        return;
      }
      targets[index]?.classList.add("is-idle-flash");
      index += 1;
    };

    const startAttract = () => {
      targets = Array.from(
        root.querySelectorAll<HTMLElement>("[data-idle-flash]"),
      ).filter((el) => el.getClientRects().length > 0);
      if (targets.length === 0) {
        armIdle();
        return;
      }
      root.classList.add("is-idle-attract");
      index = 0;
      playIdleFlash();
      const stepMs = Math.max(40, Math.floor(FLASH_PASS_MS / targets.length));
      stepFlash();
      flashTimer = window.setInterval(stepFlash, stepMs);
    };

    const onActivity = () => armIdle();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    root.addEventListener("pointerdown", onActivity, opts);
    root.addEventListener("keydown", onActivity, opts);
    root.addEventListener("wheel", onActivity, opts);
    root.addEventListener("touchstart", onActivity, opts);

    armIdle();

    return () => {
      stopAttract();
      window.clearTimeout(idleTimer);
      root.removeEventListener("pointerdown", onActivity, opts);
      root.removeEventListener("keydown", onActivity, opts);
      root.removeEventListener("wheel", onActivity, opts);
      root.removeEventListener("touchstart", onActivity, opts);
    };
  }, [rootRef]);
}
