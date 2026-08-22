"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const ITEMS = [
  {
    href: "/resources/#investigate",
    label: ".Investigate",
    lcd: "INVESTIGATE",
    led: "led-sky",
  },
  {
    href: "/resources/#playlist",
    label: ".Playlist",
    lcd: "PLAYLIST",
    led: "led-yellow",
  },
  {
    href: "/resources/#skills",
    label: ".Skills",
    lcd: "SKILLS",
    led: "led-green",
  },
] as const;

const IDLE_LCD = "OPTIONS — SELECT";

/**
 * Floating MPC options pad. Collapsed by default on every breakpoint; expands
 * into a small LED screen with out-of-lesson links.
 */
export function LessonToolbar() {
  const [open, setOpen] = useState(false);
  const [lcd, setLcd] = useState(IDLE_LCD);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      setLcd(IDLE_LCD);
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className={`lesson-toolbar${open ? " is-open" : ""}`} ref={rootRef}>
      <div
        className="lesson-toolbar-panel"
        id={panelId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="lesson-toolbar-lcd">
          <span className="lcd">{lcd}</span>
        </div>
        <nav className="lesson-toolbar-nav" aria-label="Out-of-lesson material">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              className="lesson-toolbar-item"
              href={item.href}
              onMouseEnter={() => setLcd(item.lcd)}
              onMouseLeave={() => setLcd(IDLE_LCD)}
              onFocus={() => setLcd(item.lcd)}
              onBlur={() => setLcd(IDLE_LCD)}
            >
              <span className={`led ${item.led}`} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className="lesson-toolbar-pad"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close lesson options" : "Open lesson options"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="led led-sky" aria-hidden="true" />
        OPTIONS
      </button>
    </div>
  );
}
