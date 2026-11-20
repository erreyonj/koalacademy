"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COMMON_MAJOR_KEYS,
  COMMON_MINOR_KEYS,
  familyFromKey,
  keyFromTonicLetter,
  parseKeyName,
  remapScoreToKey,
  setKeyMode,
  stepKey,
  withKey,
  type KeyMode,
} from "@/lib/notation/key";
import { playNote, resumePiano } from "@/components/keys-lite/piano";
import { ALL_WORDS } from "@/features/staff-decode/words";
import { emptyScore, eventBeats } from "@/lib/notation/parse";
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
import {
  pickRandomLetters,
  pickSpellingWord,
  scoreFromSpellingLetters,
} from "@/lib/notation/spellingGenerate";
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
import { NoteSpelling, spellLetters } from "./NoteSpelling";

const PLAYBACK_BPM = 90;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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

type ActivityMode = "off" | "spelling";

const ACTIVITIES: { id: ActivityMode; label: string }[] = [
  { id: "off", label: "Load…" },
  { id: "spelling", label: "Spelling" },
];

function keyDisplayName(key: string): string {
  const parsed = parseKeyName(key);
  return parsed.mode === "major"
    ? `${parsed.tonic} major`
    : `${parsed.tonic} minor`;
}

function Control({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="notation-control">
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </div>
  );
}

export function NotationSandbox({ initial }: { initial?: ScoreExcerpt }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playGenRef = useRef(0);
  const [score, setScore] = useState<ScoreExcerpt>(initial ?? emptyScore());
  const [cursor, setCursor] = useState<CursorMode>("note");
  const [duration, setDuration] = useState<Duration>("q");
  const [family, setFamily] = useState<AccidentalFamily>(familyFromKey(score.key));
  const [activity, setActivity] = useState<ActivityMode>("off");
  const [playing, setPlaying] = useState(false);
  const lastGeneratedWordRef = useRef<string | null>(null);

  const parsed = useMemo(() => parseKeyName(score.key), [score.key]);
  const durationLabel =
    DURATIONS.find((item) => item.id === duration)?.label ?? "Quarter";
  const cursorLabel =
    CURSORS.find((item) => item.id === cursor)?.label ?? "Note";
  const activityLabel =
    ACTIVITIES.find((item) => item.id === activity)?.label ?? "Load…";
  const durationDisabled = cursor === "erase" || cursor === "key";
  const spellingOn = activity === "spelling";
  const spellingTonic = useMemo(
    () => (spellingOn ? (spellLetters(score)[0] ?? "C") : null),
    [spellingOn, score],
  );
  const hasNotes = score.measures.some((measure) =>
    measure.events.some((event) => event.kind === "note"),
  );

  useEffect(() => {
    if (!spellingOn) return;
    setCursor((current) => (current === "key" ? "note" : current));
  }, [spellingOn]);

  useEffect(() => {
    if (!spellingOn || !spellingTonic) return;
    const next = keyFromTonicLetter(spellingTonic, parsed.mode);
    if (parseKeyName(score.key).name === parseKeyName(next).name) return;
    setScore((current) => remapScoreToKey(current, next));
    setFamily(familyFromKey(next));
  }, [spellingOn, spellingTonic, parsed.mode, score.key]);

  useEffect(() => {
    return () => {
      playGenRef.current += 1;
    };
  }, []);

  function applyKey(next: string) {
    if (spellingOn) return;
    setScore((current) => withKey(current, next));
    setFamily(familyFromKey(next));
  }

  function applyMode(mode: KeyMode) {
    if (spellingOn) {
      const next = keyFromTonicLetter(spellingTonic ?? "C", mode);
      setScore((current) => remapScoreToKey(current, next));
      setFamily(familyFromKey(next));
      return;
    }
    applyKey(setKeyMode(score.key, mode));
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
    if (spellingOn) return;
    applyKey(stepKey(score.key, action, family));
  }

  function generateSpelling(kind: "word" | "random") {
    stopPlayback();
    const letters =
      kind === "word"
        ? pickSpellingWord(ALL_WORDS, lastGeneratedWordRef.current ?? undefined)
        : pickRandomLetters();
    if (kind === "word") lastGeneratedWordRef.current = letters;
    setDuration("q");
    const next = scoreFromSpellingLetters(score, letters, parsed.mode, "q");
    setScore(next);
    setFamily(familyFromKey(next.key));
  }

  function downloadStaff(kind: "svg" | "png") {
    const staff = hostRef.current?.querySelector<HTMLElement>(".notation-staff");
    if (!staff) return;
    const fileName = `${score.key}-${score.clef}-${score.time}`;
    if (kind === "svg") downloadSvg(staff, fileName);
    else void downloadPng(staff, fileName);
  }

  function stopPlayback() {
    playGenRef.current += 1;
    setPlaying(false);
  }

  async function playStaff() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (!hasNotes) return;
    resumePiano();
    const gen = ++playGenRef.current;
    setPlaying(true);
    const beatMs = 60_000 / PLAYBACK_BPM;
    for (const measure of score.measures) {
      for (const event of measure.events) {
        if (gen !== playGenRef.current) return;
        const holdMs = Math.max(eventBeats(event) * beatMs, 80);
        if (event.kind === "note") playNote(event.pitch);
        await sleep(holdMs);
      }
    }
    if (gen === playGenRef.current) setPlaying(false);
  }

  return (
    <div className={`notation-sandbox cursor-${cursor}`} ref={hostRef}>
      <div className="deck-screen">
        <span className="lcd">
          {score.clef} · {score.key} · {score.time} · {cursor}
        </span>
      </div>

      <div className="notation-controls tools-buttons" role="toolbar" aria-label="Staff settings">
        <div className="notation-controls-main">
          <Control eyebrow="Activity">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">
                {activityLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={activity}
                  onValueChange={(value) => setActivity(value as ActivityMode)}
                >
                  <DropdownMenuRadioItem value="spelling">Spelling</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="off">Off</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Clef">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">
                {score.clef === "treble" ? "Treble" : "Bass"}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={score.clef}
                  onValueChange={(value) =>
                    setScore((current) => setClef(current, value as Clef))
                  }
                >
                  <DropdownMenuRadioItem value="treble">Treble</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="bass">Bass</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Key">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button" disabled={spellingOn}>
                {keyDisplayName(score.key)}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuLabel>Major</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={score.key} onValueChange={applyKey}>
                  {COMMON_MAJOR_KEYS.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {key} major
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Minor</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={score.key} onValueChange={applyKey}>
                  {COMMON_MINOR_KEYS.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {key.slice(0, -1)} minor
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Mode">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">
                {parsed.mode === "major" ? "Major" : "Minor"}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={parsed.mode}
                  onValueChange={(value) => applyMode(value as KeyMode)}
                >
                  <DropdownMenuRadioItem value="major">Major</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="minor">Minor</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Accidentals">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button" disabled={spellingOn}>
                {family === "sharp" ? "Sharps" : "Flats"}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={family}
                  onValueChange={(value) => {
                    if (spellingOn) return;
                    setFamily(value as AccidentalFamily);
                  }}
                >
                  <DropdownMenuRadioItem value="sharp">Sharps</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="flat">Flats</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Time">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button" disabled={spellingOn}>
                {score.time}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={score.time}
                  onValueChange={(value) => {
                    if (spellingOn) return;
                    setScore((current) => setTime(current, value as TimeSignature));
                  }}
                >
                  {TIMES.map((time) => (
                    <DropdownMenuRadioItem key={time} value={time}>
                      {time}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Cursor">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">
                {cursorLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={cursor}
                  onValueChange={(value) => {
                    if (spellingOn && value === "key") return;
                    setCursor(value as CursorMode);
                  }}
                >
                  {CURSORS.filter((item) => !(spellingOn && item.id === "key")).map(
                    (item) => (
                      <DropdownMenuRadioItem key={item.id} value={item.id}>
                        {item.label}
                      </DropdownMenuRadioItem>
                    ),
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          <Control eyebrow="Duration">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button" disabled={durationDisabled}>
                {durationLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={duration}
                  onValueChange={(value) => setDuration(value as Duration)}
                >
                  {DURATIONS.map((item) => (
                    <DropdownMenuRadioItem key={item.id} value={item.id}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>

          {spellingOn ? (
            <Control eyebrow="Generate">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">Generate</DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                  <DropdownMenuItem onSelect={() => generateSpelling("word")}>
                    Word
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => generateSpelling("random")}>
                    Random
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Control>
          ) : null}
        </div>

        <div className="notation-controls-end">
          <Control eyebrow="Play">
            <button
              type="button"
              className="tools-button"
              disabled={!playing && !hasNotes}
              aria-pressed={playing}
              onClick={() => {
                void playStaff();
              }}
            >
              {playing ? "Stop" : "Play"}
            </button>
          </Control>

          {spellingOn ? (
            <Control eyebrow="Erase">
              <button
                type="button"
                className="tools-button"
                onClick={() => {
                  stopPlayback();
                  setScore((current) => emptyScore(current));
                }}
              >
                Erase
              </button>
            </Control>
          ) : (
            <Control eyebrow="Preset">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">Load…</DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                  {PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onSelect={() => {
                        stopPlayback();
                        setScore(structuredClone(preset.score));
                        setFamily(familyFromKey(preset.score.key));
                      }}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </Control>
          )}

          <Control eyebrow="Export">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">Download</DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                {!spellingOn ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => setScore((current) => emptyScore(current))}
                    >
                      Clear notes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem onSelect={() => downloadStaff("svg")}>
                  SVG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadStaff("png")}>
                  PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Control>
        </div>
      </div>

      <p className="notation-hint">
        {spellingOn
          ? "Place notes to spell a word (F–E–E–D → FEED). The first letter sets the tonic for Mode; key accidentals apply automatically. Double-click a note to erase it."
          : "Click the right of the key signature to add an accidental, the left to remove one. Double-click a note or rest to erase it."}
      </p>

      <div className={`notation-stage${spellingOn ? " has-spelling" : ""}`}>
        <div className="notation-stage-main">
          <NotationStaff
            score={score}
            interactive
            wrapSystems={spellingOn}
            scale={spellingOn ? 1.85 : 1.3}
            compact={spellingOn}
            label="Editable staff"
            onStaffClick={(click) => handleStaffClick(click.pitch)}
            onEventClick={(hit, pitch) =>
              handleEventClick(hit.measureIndex, hit.eventIndex, pitch)
            }
            onEventDoubleClick={(hit) => {
              setScore((current) =>
                removeEvent(current, hit.measureIndex, hit.eventIndex),
              );
            }}
            onKeyAreaClick={(click) => {
              if (spellingOn) return;
              if (cursor === "key" || cursor === "note" || cursor === "rest") {
                handleKeyArea(click.action);
              }
            }}
          />
        </div>
        {spellingOn ? <NoteSpelling score={score} /> : null}
      </div>
    </div>
  );
}
