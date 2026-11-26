"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BOREALIS_PITCHES, round2 } from "../model";
import type { PitchName } from "../types";

export const field =
  "w-24 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-right font-mono text-xs text-zinc-100";
export const select =
  "rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100";
export const button =
  "inline-flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-40";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && round2(n) !== value) onCommit(round2(n));
    else setText(String(value));
  };
  return (
    <Row label={label}>
      <input
        className={field}
        value={text}
        inputMode="decimal"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setText(String(value));
            e.currentTarget.blur();
          }
        }}
      />
    </Row>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-zinc-800 pb-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

/** The pitches a Borealis can be assigned (A3 to E5). There is no "auto". */
export function BorealisPitchSelect({
  value,
  onChange,
  testId,
}: {
  value: PitchName;
  onChange: (p: PitchName) => void;
  testId?: string;
}) {
  return (
    <select
      className={select}
      value={value}
      data-testid={testId}
      aria-label="Borealis pitch"
      onChange={(e) => onChange(e.target.value as PitchName)}
    >
      {BOREALIS_PITCHES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
