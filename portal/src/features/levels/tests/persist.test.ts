import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addBorealis,
  addTerrain,
  createLevel,
  hashSeed,
  parseLevel,
  setEnter,
  validateLevel,
} from "../model";
import { STORAGE_KEY, clearDraft, editorEnabled, loadDraft, saveDraft } from "../persist";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe("autosave", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true,
    });
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("round-trips a level", () => {
    let level = createLevel("round-trip");
    level = addTerrain(level, {
      id: "terrain-1",
      closed: false,
      tickSeed: hashSeed("terrain-1"),
      points: [
        { x: 0, y: 300 },
        { x: 450, y: 350 },
        { x: 900, y: 300 },
      ],
    });
    level = addBorealis(level, { id: "gem-1", x: 450, y: 800, pitch: "G4" });
    level = setEnter(level, { x: 450, y: 120, vx: 0, vy: 600 });
    saveDraft(level);
    expect(loadDraft()).toEqual(level);
  });

  it("returns null when nothing is saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("returns null for corrupted data", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadDraft()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadDraft()).toBeNull();
  });

  it("clears the draft", () => {
    saveDraft(createLevel("gone"));
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

describe("dev gating", () => {
  it("is off outside development", () => {
    // Vitest runs with NODE_ENV=test.
    expect(editorEnabled()).toBe(false);
  });
});

describe("notehead/levels", () => {
  const dir = path.resolve(__dirname, "../../notehead/levels");
  const files = readdirSync(dir).filter((f) => f.endsWith(".level.json"));

  it("every exported file parses, validates and is named after its id", () => {
    for (const file of files) {
      const parsed = parseLevel(readFileSync(path.join(dir, file), "utf8"));
      expect(parsed.ok, file).toBe(true);
      if (parsed.ok) {
        expect(validateLevel(parsed.level), file).toEqual([]);
        expect(file).toBe(`${parsed.level.id}.level.json`);
      }
    }
  });
});
