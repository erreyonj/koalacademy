"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  applyBacklight,
  backlightPalette,
  backlightSwatch,
  readBacklightId,
  storeBacklight,
  type BacklightSwatch,
} from "@/features/theme/backlight";
import { useTheme } from "@/features/theme/ThemeProvider";

const SIDEBAR_WIDTH = "20rem";
const SIDEBAR_WIDTH_ICON = "5rem";

export function BacklightPicker() {
  const { theme } = useTheme();
  const { isMobile, state } = useSidebar();
  const palette = backlightPalette(theme);
  const [swatchId, setSwatchId] = useState(palette[0].id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    const next = backlightSwatch(theme, readBacklightId(theme));
    setSwatchId(next.id);
    applyBacklight(next);
    setOpen(false);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(swatch: BacklightSwatch) {
    setSwatchId(swatch.id);
    storeBacklight(theme, swatch);
    setOpen(false);
  }

  const wheel = palette.map((swatch) => swatch.face).join(", ");
  const left =
    state === "collapsed"
      ? `calc(${SIDEBAR_WIDTH_ICON} + 0.4rem)`
      : `calc(${SIDEBAR_WIDTH} + 0.4rem)`;
  const groups = [
    { id: "brand", label: "Brand" },
    { id: "statement", label: "Statement" },
  ] as const;

  return (
    <div
      ref={rootRef}
      className={isMobile ? "backlight-picker is-footer" : "backlight-picker"}
      style={isMobile ? undefined : { left }}
    >
      <button
        type="button"
        className="backlight-wheel"
        aria-expanded={open}
        aria-controls={labelId}
        aria-label="Button backlight"
        onClick={() => setOpen((on) => !on)}
        style={{ background: `conic-gradient(${wheel})` }}
      />
      {open ? (
        <div id={labelId} className="backlight-menu">
          {groups.map((group) => (
            <div key={group.id} className="backlight-group" role="listbox" aria-label={group.label}>
              <p className="backlight-group-label">{group.label}</p>
              {palette
                .filter((swatch) => swatch.group === group.id)
                .map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    role="option"
                    aria-selected={swatch.id === swatchId}
                    className="backlight-option"
                    onClick={() => choose(swatch)}
                  >
                    <span className="backlight-dot" style={{ background: swatch.face }} />
                    {swatch.label}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
