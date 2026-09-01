"use client";

import { useState } from "react";
import {
  anyRhythmExtras,
  EMPTY_RHYTHM_EXTRAS,
  randomRhythm,
  RHYTHM_BAR_COUNTS,
  RHYTHM_TIMES,
  type RhythmBarCount,
  type RhythmExtras,
} from "@/lib/notation/randomRhythm";
import type { TimeSignature } from "@/lib/notation/types";
import { NotationStaff } from "./NotationStaff";

const EXTRA_FLAGS: { id: keyof RhythmExtras; label: string }[] = [
  { id: "dotted", label: "Dotted" },
  { id: "triplets", label: "Triplets" },
  { id: "sixteenths", label: "16ths" },
  { id: "eighthRests", label: "8th rests" },
];

export function RhythmRandomizer() {
  const [time, setTime] = useState<TimeSignature>("4/4");
  const [bars, setBars] = useState<RhythmBarCount>(2);
  const [extras, setExtras] = useState<RhythmExtras>(EMPTY_RHYTHM_EXTRAS);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [score, setScore] = useState(() => randomRhythm({ time: "4/4", bars: 2 }));

  function generate(
    nextTime = time,
    nextBars = bars,
    nextExtras = extras,
  ) {
    setScore(randomRhythm({ time: nextTime, bars: nextBars, extras: nextExtras }));
  }

  function toggleExtra(id: keyof RhythmExtras) {
    const next = { ...extras, [id]: !extras[id] };
    setExtras(next);
    generate(time, bars, next);
  }

  const extrasOn = anyRhythmExtras(extras);

  return (
    <div className="notation-sandbox rhythm-randomizer">
      <aside className="notation-sidebar" aria-label="Rhythm settings">
        <p className="eyebrow">Rhythm</p>

        <label className="notation-label">
          Time
          <select
            value={time}
            onChange={(event) => {
              const next = event.target.value as TimeSignature;
              setTime(next);
              generate(next, bars, extras);
            }}
          >
            {RHYTHM_TIMES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="notation-label">
          Bars
          <select
            value={bars}
            onChange={(event) => {
              const next = Number(event.target.value) as RhythmBarCount;
              setBars(next);
              generate(time, next, extras);
            }}
          >
            {RHYTHM_BAR_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <div className="notation-sidebar-actions">
          <button
            type="button"
            className="notation-btn"
            aria-pressed={extrasOn}
            aria-expanded={extrasOpen}
            onClick={() => setExtrasOpen((open) => !open)}
          >
            Extras
          </button>
          
          <button type="button" className="notation-btn" onClick={() => generate()}>
            Generate
          </button>
        </div>

        {extrasOpen ? (
          <div className="rhythm-extras">
            {EXTRA_FLAGS.map((item) => {
              const disabled = item.id === "triplets" && time === "6/8";
              return (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={extras[item.id]}
                    disabled={disabled}
                    onChange={() => toggleExtra(item.id)}
                  />
                  {item.label}
                </label>
              );
            })}
          </div>
        ) : null}
      </aside>

      <div className="notation-stage">
        <div className="deck-screen">
          <span className="lcd">
            {score.time} · {score.measures.length} bar
            {score.measures.length === 1 ? "" : "s"}
          </span>
        </div>
        <NotationStaff score={score} wrapSystems label="Random rhythm" />
      </div>
    </div>
  );
}
