"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COMPONENT_FILTERS, getComponentFilter } from "@/lib/components";

const IDLE_LCD = "COMPONENTS — SELECT";
const ALL_LCD = "All lessons";

interface BandComponentToolbarProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

function idleLcd(selectedId: string): string {
  if (!selectedId) return IDLE_LCD;
  return getComponentFilter(selectedId)?.label ?? IDLE_LCD;
}

/**
 * Floating MPC pad for band lists. Same bottom-right placement as OPTIONS.
 */
export function BandComponentToolbar({
  selectedId,
  onSelect,
}: BandComponentToolbarProps) {
  const [open, setOpen] = useState(false);
  const [lcd, setLcd] = useState(idleLcd(selectedId));
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const filtered = Boolean(selectedId);

  useEffect(() => {
    setLcd(idleLcd(selectedId));
  }, [selectedId]);

  useEffect(() => {
    if (!open) {
      setLcd(idleLcd(selectedId));
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
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
  }, [open, selectedId]);

  function preview(text: string) {
    setLcd(text);
  }

  function restoreIdle() {
    setLcd(idleLcd(selectedId));
  }

  function choose(id: string) {
    onSelect(selectedId === id ? "" : id);
  }

  const classes = [
    "lesson-toolbar",
    "component-toolbar",
    open ? "is-open" : "",
    filtered ? "is-filtered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} ref={rootRef}>
      <div
        className="lesson-toolbar-panel"
        id={panelId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="lesson-toolbar-lcd">
          <span className="lcd">{lcd}</span>
        </div>
        <nav className="lesson-toolbar-nav" aria-label="Component filters">
          <button
            type="button"
            className={`lesson-toolbar-item is-all${!selectedId ? " is-selected" : ""}`}
            aria-pressed={!selectedId}
            onMouseEnter={() => preview(ALL_LCD)}
            onMouseLeave={restoreIdle}
            onFocus={() => preview(ALL_LCD)}
            onBlur={restoreIdle}
            onClick={() => onSelect("")}
          >
            <span className="led led-sky" aria-hidden="true" />
            ALL
          </button>
          {COMPONENT_FILTERS.map((item) => {
            const selected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`lesson-toolbar-item${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onMouseEnter={() => preview(item.label)}
                onMouseLeave={restoreIdle}
                onFocus={() => preview(item.label)}
                onBlur={restoreIdle}
                onClick={() => choose(item.id)}
              >
                <span className="led led-green" aria-hidden="true" />
                {item.abbrev}
              </button>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        className="lesson-toolbar-pad"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close component filters" : "Open component filters"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="led led-sky" aria-hidden="true" />
        COMPONENTS
      </button>
    </div>
  );
}
