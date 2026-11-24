"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { playAnachRepair, playTypeTick, resume } from "../modules/audio";
import type {
  StoryInterrupt as StoryInterruptData,
  StoryLineSfx,
} from "../modules/story";

function playLineSfx(id: StoryLineSfx | null | undefined): void {
  if (id === "anach-repair") playAnachRepair();
}

const CHAR_MS = 28;
/** GI fade-out before the queue advances. */
const GI_FADE_MS = 140;

function shouldTickChar(char: string): boolean {
  return char.trim().length > 0;
}

export function StoryInterrupt({
  interrupt,
  onDismiss,
}: {
  interrupt: StoryInterruptData;
  onDismiss: () => void;
}) {
  const isGi = interrupt.kind === "gi";
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState("");
  const [complete, setComplete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const fullText = interrupt.lines[lineIndex] ?? "";
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const rootRef = useRef<HTMLDivElement>(null);
  const typeTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  // Reset line cursor when a new interrupt is queued in.
  useEffect(() => {
    setLineIndex(0);
    setShown("");
    setComplete(false);
    setLeaving(false);
    rootRef.current?.focus();
  }, [interrupt]);

  useEffect(() => {
    setShown("");
    setComplete(false);
    setLeaving(false);
    if (typeTimerRef.current !== null) {
      window.clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (!fullText) {
      setComplete(true);
      return;
    }

    playLineSfx(interrupt.lineSfx?.[lineIndex]);

    // GI: show the full tip and fade in — no typewriter.
    if (isGi) {
      setShown(fullText);
      setComplete(true);
      return;
    }

    resume();
    let i = 0;
    typeTimerRef.current = window.setInterval(() => {
      i += 1;
      const next = fullText.slice(0, i);
      setShown(next);
      const char = fullText.charAt(i - 1);
      if (shouldTickChar(char)) playTypeTick();
      if (i >= fullText.length) {
        if (typeTimerRef.current !== null) {
          window.clearInterval(typeTimerRef.current);
          typeTimerRef.current = null;
        }
        setComplete(true);
      }
    }, CHAR_MS);
    return () => {
      if (typeTimerRef.current !== null) {
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, [fullText, lineIndex, interrupt, isGi]);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const finish = useCallback(() => {
    if (isGi) {
      if (leaving) return;
      setLeaving(true);
      leaveTimerRef.current = window.setTimeout(() => {
        leaveTimerRef.current = null;
        onDismissRef.current();
      }, GI_FADE_MS);
      return;
    }
    onDismissRef.current();
  }, [isGi, leaving]);

  const advance = useCallback(() => {
    if (leaving) return;
    if (!complete) {
      if (typeTimerRef.current !== null) {
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
      setShown(fullText);
      setComplete(true);
      return;
    }
    if (lineIndex < interrupt.lines.length - 1) {
      setLineIndex((n) => n + 1);
      return;
    }
    finish();
  }, [complete, fullText, lineIndex, interrupt.lines.length, finish, leaving]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isGi) finish();
        else onDismissRef.current();
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, finish, isGi]);

  const onPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    advance();
  };

  const onKeyDownBox = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
    }
  };

  if (!fullText && interrupt.lines.length === 0) return null;

  const label = isGi
    ? `${interrupt.speaker} tip`
    : `${interrupt.speaker} monologue`;

  return (
    <div
      ref={rootRef}
      className={`notehead-cutscene${leaving ? " is-leaving" : ""}`}
      data-kind={interrupt.kind}
      role="dialog"
      aria-label={label}
      aria-modal="true"
      tabIndex={0}
      data-testid="notehead-cutscene"
      onPointerDown={onPointer}
      onKeyDown={onKeyDownBox}
    >
      <div className="notehead-cutscene-box">
        {!isGi ? (
          <p className="notehead-cutscene-speaker">{interrupt.speaker}</p>
        ) : null}
        <p className="notehead-cutscene-text" aria-live="polite">
          {shown}
          <span className="notehead-cutscene-caret" aria-hidden="true">
            {!isGi && complete ? "▼" : ""}
          </span>
        </p>
        {!isGi ? (
          <p className="notehead-cutscene-prompt" aria-hidden="true">
            {complete ? "tap to continue" : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
