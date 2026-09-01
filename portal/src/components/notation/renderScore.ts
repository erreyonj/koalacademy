import {
  Accidental,
  BarlineType,
  Beam,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Tuplet,
  Voice,
  VoiceMode,
} from "vexflow/bravura";
import VexFlow from "vexflow/bravura";
import { keyImpliesAccidental, parseKeyName, splitPitch } from "@/lib/notation/key";
import { voiceTime } from "@/lib/notation/parse";
import type { Clef, ScoreExcerpt, ScoreEvent } from "@/lib/notation/types";

export type HitEvent = {
  measureIndex: number;
  eventIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RenderedStave = {
  measureIndex: number;
  stave: Stave;
  noteStartX: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RenderResult = {
  staves: RenderedStave[];
  events: HitEvent[];
};

let fontsReady: Promise<void> | null = null;

export function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = VexFlow.loadFonts("Bravura", "Academico").then(() => {
      VexFlow.setFonts("Bravura", "Academico");
    });
  }
  return fontsReady;
}

function restKey(clef: Clef): string {
  return clef === "bass" ? "d/3" : "b/4";
}

function toVexKey(pitch: string): string {
  const { letter, accidental, octave } = splitPitch(pitch);
  return `${letter.toLowerCase()}${accidental ?? ""}/${octave}`;
}

function toStaveNote(event: ScoreEvent, clef: Clef, key: string): StaveNote {
  const dots = event.dots === 1 ? 1 : 0;
  if (event.kind === "rest") {
    const rest = new StaveNote({
      keys: [restKey(clef)],
      duration: `${event.duration}r`,
      dots,
      clef,
    });
    if (dots) Dot.buildAndAttach([rest], { all: true });
    return rest;
  }
  const note = new StaveNote({
    keys: [toVexKey(event.pitch)],
    duration: event.duration,
    dots,
    clef,
    autoStem: true,
  });
  if (dots) Dot.buildAndAttach([note], { all: true });
  const { letter, accidental } = splitPitch(event.pitch);
  if (accidental && !keyImpliesAccidental(key, letter, accidental)) {
    note.addModifier(new Accidental(accidental), 0);
  } else if (!accidental && !keyImpliesAccidental(key, letter, null)) {
    note.addModifier(new Accidental("n"), 0);
  }
  return note;
}

function tupletBrackets(events: ScoreEvent[], tickables: StaveNote[]): Tuplet[] {
  const tuplets: Tuplet[] = [];
  let i = 0;
  while (i < events.length) {
    if (events[i].tuplet !== "3:2") {
      i += 1;
      continue;
    }
    const start = i;
    while (i < events.length && events[i].tuplet === "3:2") i += 1;
    const group = tickables.slice(start, i);
    if (group.length >= 2) {
      tuplets.push(
        new Tuplet(group, { numNotes: group.length, notesOccupied: 2, ratioed: false }),
      );
    }
  }
  return tuplets;
}

function vexKeySpec(key: string): string {
  return parseKeyName(key).name;
}

function systemGroups(measureCount: number, wrapSystems: boolean): number[][] {
  const indexes = Array.from({ length: measureCount }, (_, i) => i);
  if (!wrapSystems || measureCount <= 1) return [indexes];
  const systems: number[][] = [[0]];
  for (let i = 1; i < measureCount; ) {
    const row = [i];
    i += 1;
    if (i < measureCount) {
      row.push(i);
      i += 1;
    }
    systems.push(row);
  }
  return systems;
}

export type RenderOptions = {
  /** First bar on its own row; remaining bars wrap two per row. */
  wrapSystems?: boolean;
};

const SYSTEM_TOP = 28;
const SYSTEM_HEIGHT = 150;

export async function renderScore(
  container: HTMLDivElement,
  score: ScoreExcerpt,
  width: number,
  options: RenderOptions = {},
): Promise<RenderResult> {
  await ensureFonts();
  container.innerHTML = "";

  const wrapSystems = options.wrapSystems ?? false;
  const measures = score.measures.length > 0 ? score.measures : [{ events: [] }];
  const groups = systemGroups(measures.length, wrapSystems);
  const height = SYSTEM_TOP + SYSTEM_HEIGHT * groups.length;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(Math.max(width, 240), height);
  const ctx = renderer.getContext();

  const padding = 8;
  const inner = Math.max(width - padding * 2, 200);
  const staves: RenderedStave[] = [];
  const events: HitEvent[] = [];

  groups.forEach((group, systemIndex) => {
    const y = SYSTEM_TOP + systemIndex * SYSTEM_HEIGHT;
    const clefPad = 52;
    const even = Math.max(Math.floor((inner - clefPad) / group.length), 120);
    let x = padding;

    group.forEach((measureIndex, slot) => {
      const measureWidth = slot === 0 ? even + clefPad : even;
      const stave = new Stave(x, y, measureWidth);
      if (slot === 0) {
        stave.addClef(score.clef);
        if (systemIndex === 0) {
          stave.addKeySignature(vexKeySpec(score.key)).addTimeSignature(score.time);
        }
      }
      if (measureIndex === measures.length - 1) {
        stave.setEndBarType(BarlineType.END);
      }
      stave.setContext(ctx).draw();

      staves.push({
        measureIndex,
        stave,
        noteStartX: stave.getNoteStartX(),
        x: stave.getX(),
        y: stave.getY(),
        width: stave.getWidth(),
        height: stave.getBottomY() - stave.getY(),
      });

      const measureEvents = measures[measureIndex].events;
      if (measureEvents.length > 0) {
        const tickables = measureEvents.map((event) => toStaveNote(event, score.clef, score.key));
        const tuplets = tupletBrackets(measureEvents, tickables);
        const voice = new Voice(voiceTime(score.time)).setMode(VoiceMode.SOFT);
        voice.addTickables(tickables);
        new Formatter().joinVoices([voice]).formatToStave([voice], stave);
        let beams: Beam[] = [];
        try {
          beams = Beam.generateBeams(tickables);
        } catch {
          // Incomplete or mixed rhythms can refuse a beam; notes still draw.
        }
        voice.draw(ctx, stave);
        for (const beam of beams) beam.setContext(ctx).draw();
        for (const tuplet of tuplets) tuplet.setContext(ctx).draw();

        tickables.forEach((note, eventIndex) => {
          const box = note.getBoundingBox();
          events.push({
            measureIndex,
            eventIndex,
            x: box.getX(),
            y: box.getY(),
            w: Math.max(box.getW(), 12),
            h: Math.max(box.getH(), 12),
          });
        });
      }

      x += measureWidth;
    });
  });

  const svg = container.querySelector("svg");
  if (svg) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("role", "img");
    if (!svg.querySelector("[data-bg]")) {
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("data-bg", "true");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", "white");
      svg.insertBefore(bg, svg.firstChild);
    }
  }

  return { staves, events };
}

export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const mapped = point.matrixTransform(ctm.inverse());
  return { x: mapped.x, y: mapped.y };
}
