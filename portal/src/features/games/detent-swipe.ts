"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type DetentSwipeMode = "accumulate" | "single";

/**
 * Vertical detent math. Positive `steps` means swipe-up (+1) calls; negative
 * means swipe-down (-1). `accumulate` may fire several steps and keep the
 * remainder; `single` fires at most one and discards leftover pixels.
 */
export function applyDetentSwipe(
  accum: number,
  deltaY: number,
  threshold: number,
  mode: DetentSwipeMode,
): { accum: number; steps: number } {
  let next = accum + deltaY;
  let steps = 0;

  if (mode === "single") {
    if (Math.abs(next) < threshold) {
      return { accum: next, steps: 0 };
    }
    return { accum: 0, steps: next < 0 ? 1 : -1 };
  }

  while (next <= -threshold) {
    next += threshold;
    steps += 1;
  }
  while (next >= threshold) {
    next -= threshold;
    steps -= 1;
  }
  return { accum: next, steps };
}

function fireSteps(steps: number, onStep: (dir: 1 | -1) => void) {
  if (steps > 0) {
    for (let i = 0; i < steps; i++) onStep(1);
  } else if (steps < 0) {
    for (let i = 0; i < -steps; i++) onStep(-1);
  }
}

interface UseDetentSwipeOptions {
  threshold: number;
  mode: DetentSwipeMode;
  onStep: (dir: 1 | -1) => void;
  /** When false, pointer handlers no-op (gesture already in flight ends). */
  enabled?: boolean;
}

/**
 * Pointer-capture vertical swipe that steps a control once per detent.
 */
export function useDetentSwipe({
  threshold,
  mode,
  onStep,
  enabled = true,
}: UseDetentSwipeOptions) {
  const gestureRef = useRef({
    active: false,
    pointerId: -1,
    y: 0,
    accum: 0,
  });
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const onPointerDown = useCallback((e: ReactPointerEvent<Element>) => {
    if (!enabledRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      y: e.clientY,
      accum: 0,
    };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<Element>) => {
    const gesture = gestureRef.current;
    if (
      !gesture.active ||
      gesture.pointerId !== e.pointerId ||
      !enabledRef.current
    ) {
      return;
    }
    const deltaY = e.clientY - gesture.y;
    gesture.y = e.clientY;
    const result = applyDetentSwipe(
      gesture.accum,
      deltaY,
      thresholdRef.current,
      modeRef.current,
    );
    gesture.accum = result.accum;
    fireSteps(result.steps, onStepRef.current);
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<Element>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== e.pointerId) return;
    gesture.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
