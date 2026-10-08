"use client";

import { useEffect, useState } from "react";

export const QUICK_INFO = [
  "Level 0 During Mindfulness",
  "Hold Questions for after Mindfulness",
  "Keep it C.R.I.S.P. !",
] as const;

const INTERVAL_MS = 7000;

/** Entry reminders, one line at a time, sliding in from the right. */
export function QuickInfoTicker({ items = QUICK_INFO }: { items?: readonly string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  return (
    <div className="homeroom-ticker" aria-live="polite">
      <span key={index} className="homeroom-ticker-text">
        {items[index]}
      </span>
    </div>
  );
}
