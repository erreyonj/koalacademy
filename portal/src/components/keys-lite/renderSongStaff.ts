import {
  Accidental,
  BarlineType,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
  VoiceMode,
} from "vexflow/bravura";
import { keyImpliesAccidental, parseKeyName, splitPitch } from "@/lib/notation/key";
import { ensureFonts } from "@/components/notation/renderScore";
import { stepsToMeasures, type SongScore, type SongStep } from "./songs";

export type SongMeasureHit = {
  measureIndex: number;
  x: number;
  width: number;
  /** Mid-x of the first event in the bar (for scroll centering). */
  firstChordX: number;
};

export type SongStaffRender = {
  width: number;
  height: number;
  measures: SongMeasureHit[];
};

const MEASURE_W = 168;
const CLEF_PAD = 72;
const TOP = 28;
const TREBLE_Y = TOP;
const BASS_Y = TOP + 78;
const STAFF_BOTTOM = BASS_Y + 72;
const LABEL_Y = 16;

type DurationPiece = { duration: string; dots: 0 | 1 };

/** Split a beat length into one or more VexFlow note values (ties when needed). */
function durationPieces(beats: number): DurationPiece[] {
  const q = Math.round(beats * 2) / 2;
  switch (q) {
    case 4:
      return [{ duration: "w", dots: 0 }];
    case 3:
      return [{ duration: "h", dots: 1 }];
    case 2.5:
      return [
        { duration: "8", dots: 0 },
        { duration: "h", dots: 0 },
      ];
    case 2:
      return [{ duration: "h", dots: 0 }];
    case 1.5:
      return [{ duration: "q", dots: 1 }];
    case 1:
      return [{ duration: "q", dots: 0 }];
    case 0.5:
      return [{ duration: "8", dots: 0 }];
    default:
      return [{ duration: "q", dots: 0 }];
  }
}

function toVexKey(pitch: string): string {
  const { letter, accidental, octave } = splitPitch(pitch);
  return `${letter.toLowerCase()}${accidental ?? ""}/${octave}`;
}

function addAccidentals(note: StaveNote, pitches: string[], key: string) {
  pitches.forEach((pitch, index) => {
    const { letter, accidental } = splitPitch(pitch);
    if (accidental && !keyImpliesAccidental(key, letter, accidental)) {
      note.addModifier(new Accidental(accidental), index);
    } else if (!accidental && !keyImpliesAccidental(key, letter, null)) {
      note.addModifier(new Accidental("n"), index);
    }
  });
}

function makeNote(
  pitches: string[],
  piece: DurationPiece,
  clef: "treble" | "bass",
  key: string,
  isRest: boolean,
): StaveNote {
  if (isRest) {
    const rest = new StaveNote({
      keys: [clef === "bass" ? "d/3" : "b/4"],
      duration: `${piece.duration}r`,
      dots: piece.dots,
      clef,
    });
    if (piece.dots) Dot.buildAndAttach([rest], { all: true });
    return rest;
  }
  const note = new StaveNote({
    keys: pitches.map(toVexKey),
    duration: piece.duration,
    dots: piece.dots,
    clef,
    autoStem: true,
  });
  if (piece.dots) Dot.buildAndAttach([note], { all: true });
  addAccidentals(note, pitches, key);
  return note;
}

type BuiltVoice = {
  notes: StaveNote[];
  ties: Array<{ first: number; last: number }>;
};

function buildClefVoice(
  measureSteps: SongStep[],
  clef: "treble" | "bass",
  key: string,
): BuiltVoice {
  const notes: StaveNote[] = [];
  const ties: Array<{ first: number; last: number }> = [];

  for (const item of measureSteps) {
    const isRest = Boolean(item.rest) || item.bass == null;
    const pitches =
      clef === "treble"
        ? isRest
          ? ["B4"]
          : item.chord
        : isRest
          ? ["D3"]
          : item.bass
            ? [item.bass]
            : ["D3"];
    const pieces = durationPieces(item.beats);
    const start = notes.length;
    for (const piece of pieces) {
      notes.push(makeNote(pitches, piece, clef, key, isRest));
    }
    if (!isRest && pieces.length > 1) {
      ties.push({ first: start, last: start + pieces.length - 1 });
    }
  }

  return { notes, ties };
}

function sectionLabelAtBar(score: SongScore, barIndex: number): string | null {
  const section = score.sections.find((item) => item.startBar === barIndex);
  return section?.label ?? null;
}

function sameChordStep(a: SongStep | undefined, b: SongStep | undefined): boolean {
  if (!a || !b || a.rest || b.rest || a.bass == null || b.bass == null) return false;
  if (a.bass !== b.bass || a.chord.length !== b.chord.length) return false;
  return a.chord.every((pitch, index) => pitch === b.chord[index]);
}

export async function renderSongStaff(
  container: HTMLDivElement,
  score: SongScore,
): Promise<SongStaffRender> {
  await ensureFonts();
  container.innerHTML = "";

  const measureSteps = stepsToMeasures(score.steps);
  const barCount = measureSteps.length;
  const width = CLEF_PAD + barCount * MEASURE_W + 24;
  const height = STAFF_BOTTOM + 16;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  const keySpec = parseKeyName(score.key).name;
  const measures: SongMeasureHit[] = [];
  const drawnTies: StaveTie[] = [];
  let prevTreble: StaveNote[] | null = null;
  let prevBass: StaveNote[] | null = null;
  let prevSteps: SongStep[] | null = null;

  let x = 12;
  for (let bar = 0; bar < barCount; bar += 1) {
    const steps = measureSteps[bar];
    const measureWidth = bar === 0 ? MEASURE_W + CLEF_PAD : MEASURE_W;
    const treble = new Stave(x, TREBLE_Y, measureWidth);
    const bass = new Stave(x, BASS_Y, measureWidth);

    if (bar === 0) {
      treble.addClef("treble").addKeySignature(keySpec).addTimeSignature(score.timeSignature);
      bass.addClef("bass").addKeySignature(keySpec).addTimeSignature(score.timeSignature);
    }
    if (bar === barCount - 1) {
      treble.setEndBarType(BarlineType.END);
      bass.setEndBarType(BarlineType.END);
    }

    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();

    if (bar === 0) {
      new StaveConnector(treble, bass)
        .setType(StaveConnector.type.BRACE)
        .setContext(ctx)
        .draw();
      new StaveConnector(treble, bass)
        .setType(StaveConnector.type.SINGLE_LEFT)
        .setContext(ctx)
        .draw();
    }
    new StaveConnector(treble, bass)
      .setType(StaveConnector.type.SINGLE_RIGHT)
      .setContext(ctx)
      .draw();

    const trebleBuilt = buildClefVoice(steps, "treble", score.key);
    const bassBuilt = buildClefVoice(steps, "bass", score.key);
    const trebleVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(VoiceMode.SOFT);
    const bassVoice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(VoiceMode.SOFT);
    trebleVoice.addTickables(trebleBuilt.notes);
    bassVoice.addTickables(bassBuilt.notes);
    new Formatter()
      .joinVoices([trebleVoice, bassVoice])
      .formatToStave([trebleVoice, bassVoice], treble);

    trebleVoice.draw(ctx, treble);
    bassVoice.draw(ctx, bass);

    for (const tie of trebleBuilt.ties) {
      drawnTies.push(
        new StaveTie({
          firstNote: trebleBuilt.notes[tie.first],
          lastNote: trebleBuilt.notes[tie.last],
          firstIndexes: trebleBuilt.notes[tie.first].getKeyProps().map((_, i) => i),
          lastIndexes: trebleBuilt.notes[tie.last].getKeyProps().map((_, i) => i),
        }),
      );
    }
    for (const tie of bassBuilt.ties) {
      drawnTies.push(
        new StaveTie({
          firstNote: bassBuilt.notes[tie.first],
          lastNote: bassBuilt.notes[tie.last],
          firstIndexes: [0],
          lastIndexes: [0],
        }),
      );
    }

    if (prevSteps && prevTreble && prevBass) {
      const prevLast = prevSteps[prevSteps.length - 1];
      const nextFirst = steps[0];
      if (sameChordStep(prevLast, nextFirst)) {
        const leftTreble = prevTreble[prevTreble.length - 1];
        const rightTreble = trebleBuilt.notes[0];
        const leftBass = prevBass[prevBass.length - 1];
        const rightBass = bassBuilt.notes[0];
        drawnTies.push(
          new StaveTie({
            firstNote: leftTreble,
            lastNote: rightTreble,
            firstIndexes: leftTreble.getKeyProps().map((_, i) => i),
            lastIndexes: rightTreble.getKeyProps().map((_, i) => i),
          }),
          new StaveTie({
            firstNote: leftBass,
            lastNote: rightBass,
            firstIndexes: [0],
            lastIndexes: [0],
          }),
        );
      }
    }

    const label = sectionLabelAtBar(score, bar);
    if (label) {
      ctx.setFont("Academico", 13, "bold");
      ctx.fillText(label, x + (bar === 0 ? CLEF_PAD * 0.35 : 8), LABEL_Y);
    }

    const firstBox = trebleBuilt.notes[0]?.getBoundingBox();
    measures.push({
      measureIndex: bar,
      x,
      width: measureWidth,
      firstChordX: firstBox
        ? firstBox.getX() + firstBox.getW() / 2
        : x + measureWidth / 2,
    });

    prevTreble = trebleBuilt.notes;
    prevBass = bassBuilt.notes;
    prevSteps = steps;
    x += measureWidth;
  }

  for (const tie of drawnTies) tie.setContext(ctx).draw();

  const svg = container.querySelector("svg");
  if (svg) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${score.title} grand staff`);
    if (!svg.querySelector("[data-bg]")) {
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("data-bg", "true");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", "white");
      svg.insertBefore(bg, svg.firstChild);
    }
  }

  return { width, height, measures };
}

export function highlightSongBar(
  container: HTMLDivElement,
  measures: SongMeasureHit[],
  activeBar: number | null,
) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  svg.querySelector("[data-active-bar]")?.remove();
  if (activeBar == null || !measures[activeBar]) return;
  const hit = measures[activeBar];
  const hl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  hl.setAttribute("data-active-bar", "true");
  hl.setAttribute("x", String(hit.x));
  hl.setAttribute("y", String(TOP - 8));
  hl.setAttribute("width", String(hit.width));
  hl.setAttribute("height", String(STAFF_BOTTOM - TOP + 12));
  hl.setAttribute("fill", "rgba(196, 168, 90, 0.28)");
  hl.setAttribute("pointer-events", "none");
  const bg = svg.querySelector("[data-bg]");
  if (bg?.nextSibling) svg.insertBefore(hl, bg.nextSibling);
  else svg.insertBefore(hl, svg.firstChild);
}
