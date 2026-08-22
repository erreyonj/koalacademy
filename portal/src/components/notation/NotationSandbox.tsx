"use client";

import { useMemo, useRef, useState } from "react";
import {
  COMMON_MAJOR_KEYS,
  COMMON_MINOR_KEYS,
  familyFromKey,
  parseKeyName,
  setKeyMode,
  stepKey,
  withKey,
} from "@/lib/notation/key";
import { emptyScore } from "@/lib/notation/parse";
import { PRESETS } from "@/lib/notation/presets";
import {
  placeNote,
  placeRest,
  removeEvent,
  replaceEvent,
  replaceWithNote,
  setClef,
  setTime,
} from "@/lib/notation/score";
import type {
  AccidentalFamily,
  Clef,
  CursorMode,
  Duration,
  ScoreExcerpt,
  TimeSignature,
} from "@/lib/notation/types";
import { downloadPng, downloadSvg } from "./download";
import { NotationStaff } from "./NotationStaff";

const DURATIONS: { id: Duration; label: string }[] = [
  { id: "w", label: "Whole" },
  { id: "h", label: "Half" },
  { id: "q", label: "Quarter" },
  { id: "8", label: "Eighth" },
];

const TIMES: TimeSignature[] = ["4/4", "3/4", "6/8"];

const CURSORS: { id: CursorMode; label: string }[] = [
  { id: "note", label: "Note" },
  { id: "rest", label: "Rest" },
  { id: "key", label: "Key" },
  { id: "erase", label: "Erase" },
];

export function NotationSandbox({ initial }: { initial?: ScoreExcerpt }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState<ScoreExcerpt>(initial ?? emptyScore());
  const [cursor, setCursor] = useState<CursorMode>("note");
  const [duration, setDuration] = useState<Duration>("q");
  const [family, setFamily] = useState<AccidentalFamily>(familyFromKey(score.key));

  const parsed = useMemo(() => parseKeyName(score.key), [score.key]);

  function applyKey(next: string) {
    setScore((current) => withKey(current, next));
    setFamily(familyFromKey(next));
  }

  function handleStaffClick(naturalPitch: string) {
    if (cursor === "note") {
      setScore((current) => placeNote(current, naturalPitch, duration));
    } else if (cursor === "rest") {
      setScore((current) => placeRest(current, duration));
    }
  }

  function handleEventClick(measureIndex: number, eventIndex: number, naturalPitch: string) {
    if (cursor === "erase") {
      setScore((current) => removeEvent(current, measureIndex, eventIndex));
      return;
    }
    if (cursor === "note") {
      setScore((current) =>
        replaceWithNote(current, measureIndex, eventIndex, naturalPitch, duration),
      );
    } else if (cursor === "rest") {
      setScore((current) =>
        replaceEvent(current, measureIndex, eventIndex, { kind: "rest", duration }),
      );
    }
  }

  function handleKeyArea(action: "add" | "remove") {
    applyKey(stepKey(score.key, action, family));
  }

  const fileName = `${score.key}-${score.clef}-${score.time}`;

  return (
    <div className={`notation-sandbox cursor-${cursor}`} ref={hostRef}>
      <aside className="notation-sidebar" aria-label="Staff settings">
        <p className="eyebrow">Staff</p>

        <fieldset className="notation-fieldset">
          <legend>Clef</legend>
          <div className="notation-pills">
            {(["treble", "bass"] as Clef[]).map((clef) => (
              <button
                key={clef}
                type="button"
                className="notation-btn"
                aria-pressed={score.clef === clef}
                onClick={() => setScore((current) => setClef(current, clef))}
              >
                {clef === "treble" ? "Treble" : "Bass"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="notation-fieldset">
          <legend>Key</legend>
          <label className="notation-label">
            Signature
            <select
              value={score.key}
              onChange={(event) => applyKey(event.target.value)}
            >
              <optgroup label="Major">
                {COMMON_MAJOR_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key} major
                  </option>
                ))}
              </optgroup>
              <optgroup label="Minor">
                {COMMON_MINOR_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key.slice(0, -1)} minor
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div className="notation-pills">
            <button
              type="button"
              className="notation-btn"
              aria-pressed={parsed.mode === "major"}
              onClick={() => applyKey(setKeyMode(score.key, "major"))}
            >
              Major
            </button>
            <button
              type="button"
              className="notation-btn"
              aria-pressed={parsed.mode === "minor"}
              onClick={() => applyKey(setKeyMode(score.key, "minor"))}
            >
              Minor
            </button>
          </div>
          <div className="notation-pills">
            <button
              type="button"
              className="notation-btn"
              aria-pressed={family === "sharp"}
              onClick={() => setFamily("sharp")}
            >
              Sharps
            </button>
            <button
              type="button"
              className="notation-btn"
              aria-pressed={family === "flat"}
              onClick={() => setFamily("flat")}
            >
              Flats
            </button>
          </div>
          <p className="notation-hint">
            Click the right of the key signature to add an accidental, the left
            to remove one. The sidebar updates with the staff.
          </p>
        </fieldset>

        <fieldset className="notation-fieldset">
          <legend>Time</legend>
          <div className="notation-pills">
            {TIMES.map((time) => (
              <button
                key={time}
                type="button"
                className="notation-btn"
                aria-pressed={score.time === time}
                onClick={() => setScore((current) => setTime(current, time))}
              >
                {time}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="notation-fieldset">
          <legend>Cursor</legend>
          <div className="notation-pills">
            {CURSORS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="notation-btn"
                aria-pressed={cursor === item.id}
                onClick={() => setCursor(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="notation-fieldset">
          <legend>Duration</legend>
          <div className="notation-pills">
            {DURATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="notation-btn"
                aria-pressed={duration === item.id}
                disabled={cursor === "erase" || cursor === "key"}
                onClick={() => setDuration(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="notation-label">
          Presets
          <select
            value=""
            onChange={(event) => {
              const id = event.target.value;
              const preset = PRESETS.find((item) => item.id === id);
              if (!preset) return;
              setScore(structuredClone(preset.score));
              setFamily(familyFromKey(preset.score.key));
            }}
          >
            <option value="">Load a preset…</option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="notation-sidebar-actions">
          <button
            type="button"
            className="notation-btn"
            onClick={() => setScore((current) => emptyScore(current))}
          >
            Clear notes
          </button>
          <button
            type="button"
            className="notation-btn"
            onClick={() => {
              const staff = hostRef.current?.querySelector<HTMLElement>(".notation-staff");
              if (staff) downloadSvg(staff, fileName);
            }}
          >
            SVG
          </button>
          <button
            type="button"
            className="notation-btn"
            onClick={() => {
              const staff = hostRef.current?.querySelector<HTMLElement>(".notation-staff");
              if (staff) void downloadPng(staff, fileName);
            }}
          >
            PNG
          </button>
        </div>
      </aside>

      <div className="notation-stage">
        <div className="deck-screen">
          <span className="lcd">
            {score.clef} · {score.key} · {score.time} · {cursor}
          </span>
        </div>
        <NotationStaff
          score={score}
          interactive
          label="Editable staff"
          onStaffClick={(click) => handleStaffClick(click.pitch)}
          onEventClick={(hit, pitch) =>
            handleEventClick(hit.measureIndex, hit.eventIndex, pitch)
          }
          onKeyAreaClick={(click) => {
            if (cursor === "key" || cursor === "note" || cursor === "rest") {
              handleKeyArea(click.action);
            }
          }}
        />
      </div>
    </div>
  );
}
