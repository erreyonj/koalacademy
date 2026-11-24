"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import {
  NOTE_LETTERS,
  PALETTES,
  swatchesFor,
  type PaletteId,
} from "@/lib/notation/noteColors";
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
  emptyScoreForSpellingLetters,
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
import { scrollSandbox } from "@/lib/notation/sandboxScroll";
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

type ActivityMode = "off" | "spelling" | "solve";

const ACTIVITIES: { id: ActivityMode; label: string }[] = [
  { id: "off", label: "Load…" },
  { id: "spelling", label: "Spelling" },
  { id: "solve", label: "Solve" },
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
  const [playHighlight, setPlayHighlight] = useState<{
    measureIndex: number;
    eventIndex: number;
  } | null>(null);
  const [colorizeOn, setColorizeOn] = useState(false);
  const [paletteId, setPaletteId] = useState<PaletteId>("roygbiv");
  const [solveTarget, setSolveTarget] = useState<string | null>(null);
  const lastGeneratedWordRef = useRef<string | null>(null);
  const solveCelebratedRef = useRef(false);
  const lastSystemsRef = useRef<{ wrap: boolean; count: number } | null>(null);

  /**
   * Page scroll only follows the staff when a second bar is stacked underneath
   * (scroll down to it) or removed again (scroll back to the controls + bar 1).
   */
  function handleStaffRender({
    systemCount,
    wrapSystems,
  }: {
    systemCount: number;
    wrapSystems: boolean;
  }) {
    const prev = lastSystemsRef.current;
    lastSystemsRef.current = { wrap: wrapSystems, count: systemCount };
    // First draw, or an activity switch changed the layout mode: re-baseline only.
    if (!prev || prev.wrap !== wrapSystems) return;
    const grew = prev.count < 2 && systemCount >= 2;
    const shrank = prev.count >= 2 && systemCount < 2;
    if (!grew && !shrank) return;
    const kind = grew ? "bottom" : "top";
    requestAnimationFrame(() => {
      const sandbox = hostRef.current;
      const main = document.getElementById("main");
      if (sandbox && main) scrollSandbox(kind, main, sandbox);
    });
  }

  const parsed = useMemo(() => parseKeyName(score.key), [score.key]);
  const durationLabel =
    DURATIONS.find((item) => item.id === duration)?.label ?? "Quarter";
  const cursorLabel =
    CURSORS.find((item) => item.id === cursor)?.label ?? "Note";
  const activityLabel =
    ACTIVITIES.find((item) => item.id === activity)?.label ?? "Load…";
  const durationDisabled = cursor === "erase" || cursor === "key";
  const spellingOn = activity === "spelling";
  const solveOn = activity === "solve";
  const wordActivity = spellingOn || solveOn;
  const wordTonic = useMemo(() => {
    if (spellingOn) return spellLetters(score)[0] ?? "C";
    if (solveOn) {
      const letter = (solveTarget ?? "").toUpperCase().replace(/[^A-G]/g, "")[0];
      return letter ?? "C";
    }
    return null;
  }, [spellingOn, solveOn, score, solveTarget]);
  const hasNotes = score.measures.some((measure) =>
    measure.events.some((event) => event.kind === "note"),
  );
  const solveSolved = useMemo(() => {
    if (!solveOn || !solveTarget) return false;
    const target = solveTarget.toUpperCase().replace(/[^A-G]/g, "");
    if (target.length === 0) return false;
    return spellLetters(score).join("") === target;
  }, [solveOn, solveTarget, score]);

  useEffect(() => {
    if (!wordActivity) return;
    setCursor((current) => (current === "key" ? "note" : current));
  }, [wordActivity]);

  useEffect(() => {
    if (!wordActivity || !wordTonic) return;
    const next = keyFromTonicLetter(wordTonic, parsed.mode);
    if (parseKeyName(score.key).name === parseKeyName(next).name) return;
    setScore((current) => remapScoreToKey(current, next));
    setFamily(familyFromKey(next));
  }, [wordActivity, wordTonic, parsed.mode, score.key]);

  useEffect(() => {
    return () => {
      playGenRef.current += 1;
    };
  }, []);

  function applyKey(next: string) {
    if (wordActivity) return;
    setScore((current) => withKey(current, next));
    setFamily(familyFromKey(next));
  }

  function applyMode(mode: KeyMode) {
    if (wordActivity) {
      const next = keyFromTonicLetter(wordTonic ?? "C", mode);
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
    if (wordActivity) return;
    applyKey(stepKey(score.key, action, family));
  }

  function pickGeneratedLetters(kind: "word" | "random") {
    const letters =
      kind === "word"
        ? pickSpellingWord(ALL_WORDS, lastGeneratedWordRef.current ?? undefined)
        : pickRandomLetters();
    if (kind === "word") lastGeneratedWordRef.current = letters;
    return letters;
  }

  function generateSpelling(kind: "word" | "random") {
    stopPlayback();
    const letters = pickGeneratedLetters(kind);
    setDuration("q");
    if (solveOn) {
      solveCelebratedRef.current = false;
      setSolveTarget(letters.toUpperCase());
      const next = emptyScoreForSpellingLetters(score, letters, parsed.mode);
      setScore(next);
      setFamily(familyFromKey(next.key));
      return;
    }
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
    setPlayHighlight(null);
  }

  async function startPlayback(excerpt: ScoreExcerpt) {
    const playable = excerpt.measures.some((measure) =>
      measure.events.some((event) => event.kind === "note"),
    );
    if (!playable) return;
    resumePiano();
    const gen = ++playGenRef.current;
    setPlaying(true);
    const beatMs = 60_000 / PLAYBACK_BPM;
    for (let measureIndex = 0; measureIndex < excerpt.measures.length; measureIndex += 1) {
      const measure = excerpt.measures[measureIndex];
      for (let eventIndex = 0; eventIndex < measure.events.length; eventIndex += 1) {
        if (gen !== playGenRef.current) return;
        const event = measure.events[eventIndex];
        const holdMs = Math.max(eventBeats(event) * beatMs, 80);
        if (event.kind === "note") {
          setPlayHighlight({ measureIndex, eventIndex });
          playNote(event.pitch);
        } else {
          setPlayHighlight(null);
        }
        await sleep(holdMs);
      }
    }
    if (gen === playGenRef.current) {
      setPlayHighlight(null);
      setPlaying(false);
    }
  }

  async function playStaff() {
    if (playing) {
      stopPlayback();
      return;
    }
    await startPlayback(score);
  }

  useEffect(() => {
    if (!solveOn || !solveSolved) {
      solveCelebratedRef.current = false;
      return;
    }
    if (solveCelebratedRef.current) return;
    solveCelebratedRef.current = true;
    void startPlayback(score);
  }, [solveOn, solveSolved, score]);

  return (
    <div
      className={`notation-sandbox cursor-${cursor}`}
      data-testid="notation-sandbox"
      ref={hostRef}
    >
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
                  onValueChange={(value) => {
                    const next = value as ActivityMode;
                    setActivity(next);
                    if (next !== "solve") setSolveTarget(null);
                  }}
                >
                  <DropdownMenuRadioItem value="spelling">Spelling</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="solve">Solve</DropdownMenuRadioItem>
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

          {!wordActivity ? (
            <Control eyebrow="Key">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">
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
          ) : null}

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

          {wordActivity ? (
            <Control eyebrow="Colorize">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">
                  {colorizeOn ? "On" : "Off"}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                  <DropdownMenuCheckboxItem
                    checked={colorizeOn}
                    onCheckedChange={(checked) => setColorizeOn(checked === true)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    Colorize
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Palette</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={paletteId}
                    onValueChange={(value) => setPaletteId(value as PaletteId)}
                  >
                    {PALETTES.map((palette) => (
                      <DropdownMenuRadioItem
                        key={palette.id}
                        value={palette.id}
                        className="notation-palette-item"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <span className="notation-palette-label">{palette.label}</span>
                        <span className="notation-palette-swatches" aria-hidden="true">
                          {swatchesFor(palette.id).map((hex, index) => (
                            <span
                              key={`${palette.id}-${NOTE_LETTERS[index]}`}
                              className="notation-palette-swatch"
                              style={{ background: hex }}
                              title={NOTE_LETTERS[index]}
                            />
                          ))}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Control>
          ) : null}

          {!wordActivity ? (
            <Control eyebrow="Accidentals">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">
                  {family === "sharp" ? "Sharps" : "Flats"}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                  <DropdownMenuRadioGroup
                    value={family}
                    onValueChange={(value) => setFamily(value as AccidentalFamily)}
                  >
                    <DropdownMenuRadioItem value="sharp">Sharps</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="flat">Flats</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Control>
          ) : null}

          {!wordActivity ? (
            <Control eyebrow="Time">
              <DropdownMenu>
                <DropdownMenuTrigger className="tools-button">{score.time}</DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                  <DropdownMenuRadioGroup
                    value={score.time}
                    onValueChange={(value) =>
                      setScore((current) => setTime(current, value as TimeSignature))
                    }
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
          ) : null}

          <Control eyebrow="Cursor">
            <DropdownMenu>
              <DropdownMenuTrigger className="tools-button">
                {cursorLabel}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="start" className="notation-menu">
                <DropdownMenuRadioGroup
                  value={cursor}
                  onValueChange={(value) => {
                    if (wordActivity && value === "key") return;
                    setCursor(value as CursorMode);
                  }}
                >
                  {CURSORS.filter((item) => !(wordActivity && item.id === "key")).map(
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

          {wordActivity ? (
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

          {wordActivity ? (
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
                {!wordActivity ? (
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
        {solveOn
          ? "Generate a word, then place matching notes on the staff. The first letter sets the tonic for Mode. Double-click a note to erase it."
          : spellingOn
            ? "Place notes to spell a word (F–E–E–D → FEED). The first letter sets the tonic for Mode; key accidentals apply automatically. Double-click a note to erase it."
            : "Click the right of the key signature to add an accidental, the left to remove one. Double-click a note or rest to erase it."}
      </p>

      <div className={`notation-stage${wordActivity ? " has-spelling" : ""}`}>
        <div className="notation-stage-main">
          <NotationStaff
            score={score}
            interactive
            wrapSystems={wordActivity}
            scale={wordActivity ? 1.85 : 1.3}
            compact={wordActivity}
            highlight={wordActivity && colorizeOn ? playHighlight : null}
            colorize={wordActivity && colorizeOn}
            paletteId={paletteId}
            label="Editable staff"
            onRender={handleStaffRender}
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
              if (wordActivity) return;
              if (cursor === "key" || cursor === "note" || cursor === "rest") {
                handleKeyArea(click.action);
              }
            }}
          />
        </div>
        {spellingOn ? <NoteSpelling score={score} variant="spelling" /> : null}
        {solveOn ? (
          <NoteSpelling score={score} variant="solve" target={solveTarget ?? undefined} />
        ) : null}
      </div>
    </div>
  );
}
