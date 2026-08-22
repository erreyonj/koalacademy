import {
  Accidental,
  BarlineType,
  Beam,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
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
  width: number;
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
  if (event.kind === "rest") {
    return new StaveNote({
      keys: [restKey(clef)],
      duration: `${event.duration}r`,
      clef,
    });
  }
  const note = new StaveNote({
    keys: [toVexKey(event.pitch)],
    duration: event.duration,
    clef,
    autoStem: true,
  });
  const { letter, accidental } = splitPitch(event.pitch);
  if (accidental && !keyImpliesAccidental(key, letter, accidental)) {
    note.addModifier(new Accidental(accidental), 0);
  } else if (!accidental && !keyImpliesAccidental(key, letter, null)) {
    note.addModifier(new Accidental("n"), 0);
  }
  return note;
}

function vexKeySpec(key: string): string {
  return parseKeyName(key).name;
}

export async function renderScore(
  container: HTMLDivElement,
  score: ScoreExcerpt,
  width: number,
): Promise<RenderResult> {
  await ensureFonts();
  container.innerHTML = "";

  const height = 180;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(Math.max(width, 240), height);
  const ctx = renderer.getContext();

  const padding = 8;
  const measures = score.measures.length > 0 ? score.measures : [{ events: [] }];
  const inner = Math.max(width - padding * 2, 200);
  const firstWidth =
    measures.length === 1 ? inner : Math.max(Math.floor(inner * 0.56), 160);
  const restWidth =
    measures.length === 1
      ? 0
      : Math.max(Math.floor((inner - firstWidth) / (measures.length - 1)), 120);

  const staves: RenderedStave[] = [];
  const events: HitEvent[] = [];
  let x = padding;

  for (let i = 0; i < measures.length; i += 1) {
    const measureWidth = i === 0 ? firstWidth : restWidth;
    const stave = new Stave(x, 24, measureWidth);
    if (i === 0) {
      stave
        .addClef(score.clef)
        .addKeySignature(vexKeySpec(score.key))
        .addTimeSignature(score.time);
    }
    if (i === measures.length - 1) {
      stave.setEndBarType(BarlineType.END);
    }
    stave.setContext(ctx).draw();

    staves.push({
      measureIndex: i,
      stave,
      noteStartX: stave.getNoteStartX(),
      x: stave.getX(),
      width: stave.getWidth(),
    });

    const measureEvents = measures[i].events;
    if (measureEvents.length > 0) {
      const tickables = measureEvents.map((event) => toStaveNote(event, score.clef, score.key));
      const voice = new Voice(voiceTime(score.time)).setMode(VoiceMode.SOFT);
      voice.addTickables(tickables);
      new Formatter().joinVoices([voice]).formatToStave([voice], stave);
      voice.draw(ctx, stave);
      try {
        const beams = Beam.generateBeams(tickables);
        for (const beam of beams) beam.setContext(ctx).draw();
      } catch {
        // Incomplete or mixed rhythms can refuse a beam; notes still draw.
      }

      tickables.forEach((note, eventIndex) => {
        const box = note.getBoundingBox();
        events.push({
          measureIndex: i,
          eventIndex,
          x: box.getX(),
          y: box.getY(),
          w: Math.max(box.getW(), 12),
          h: Math.max(box.getH(), 12),
        });
      });
    }

    x += measureWidth;
  }

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
