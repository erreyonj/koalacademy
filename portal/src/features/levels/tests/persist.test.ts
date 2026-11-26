import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addBorealis,
  addTerrain,
  createLevel,
  hashSeed,
  parseLevel,
  serializeLevel,
  serializeRoute,
  setEnter,
  validateLevel,
  validateRoute,
} from "../model";
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  clearDraft,
  editorEnabled,
  loadDraft,
  parseLevelTexts,
  saveDraft,
} from "../persist";

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
    saveDraft([level], 0);
    expect(loadDraft()).toEqual({ levels: [level], activeIndex: 0 });
  });

  it("round-trips a route and which level is open", () => {
    const levels = [createLevel("a"), createLevel("b"), createLevel("c")];
    saveDraft(levels, 2);
    expect(loadDraft()).toEqual({ levels, activeIndex: 2 });
  });

  it("keeps the origin, and drops one that is no longer in the route", () => {
    const levels = [createLevel("a"), createLevel("b")];
    saveDraft(levels, 0, "b");
    expect(loadDraft()).toEqual({ levels, activeIndex: 0, origin: "b" });
    saveDraft(levels, 0, "gone");
    expect(loadDraft()?.origin).toBeUndefined();
  });

  it("falls back to the first level when the saved index is out of range", () => {
    saveDraft([createLevel("a"), createLevel("b")], 1);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, activeIndex: 9 }));
    expect(loadDraft()?.activeIndex).toBe(0);
  });

  it("migrates the old single-level autosave", () => {
    const level = createLevel("legacy");
    localStorage.setItem(LEGACY_STORAGE_KEY, serializeLevel(level));
    expect(loadDraft()).toEqual({ levels: [level], activeIndex: 0 });
    // Once a route is saved it wins over the old draft.
    saveDraft([createLevel("new")], 0);
    expect(loadDraft()?.levels[0]?.id).toBe("new");
  });

  it("returns null when nothing is saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("returns null for corrupted data", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadDraft()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadDraft()).toBeNull();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeIndex: 0, route: serializeRoute([createLevel("x"), createLevel("x")]) }),
    );
    expect(loadDraft()).toBeNull();
  });

  it("clears the draft", () => {
    saveDraft([createLevel("gone")], 0);
    localStorage.setItem(LEGACY_STORAGE_KEY, serializeLevel(createLevel("old")));
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

describe("importing files", () => {
  const text = (id: string) => serializeLevel(createLevel(id));

  it("takes one level file, an array file, or several files in order", () => {
    const one = parseLevelTexts([{ name: "a.level.json", text: text("a") }]);
    expect(one.ok && one.levels.map((l) => l.id)).toEqual(["a"]);

    const array = parseLevelTexts([
      { name: "route.json", text: serializeRoute([createLevel("a"), createLevel("b")]) },
    ]);
    expect(array.ok && array.levels.map((l) => l.id)).toEqual(["a", "b"]);

    const mixed = parseLevelTexts([
      { name: "route.json", text: serializeRoute([createLevel("a"), createLevel("b")]) },
      { name: "c.level.json", text: text("c") },
    ]);
    expect(mixed.ok && mixed.levels.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("rejects the whole import for a bad file, naming it", () => {
    const result = parseLevelTexts([
      { name: "a.level.json", text: text("a") },
      { name: "broken.json", text: "{nope" },
    ]);
    expect(result).toEqual({ ok: false, errors: ["broken.json: file is not valid JSON"] });
    const bad = parseLevelTexts([
      { name: "route.json", text: JSON.stringify([JSON.parse(text("a")), { version: 2 }]) },
    ]);
    expect(!bad.ok && bad.errors.join("\n")).toMatch(/route\.json: levels\[1\]: version must be 1/);
  });

  it("rejects repeated level ids across files", () => {
    const result = parseLevelTexts([
      { name: "a.level.json", text: text("a") },
      { name: "again.level.json", text: text("a") },
    ]);
    expect(result).toEqual({ ok: false, errors: ['duplicate level id "a"'] });
  });

  it("rejects an empty selection and an empty array", () => {
    expect(parseLevelTexts([]).ok).toBe(false);
    expect(parseLevelTexts([{ name: "e.json", text: "[]" }]).ok).toBe(false);
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

  it("the whole folder loads as one route with unique ids", () => {
    const entries = files.map((name) => ({
      name,
      text: readFileSync(path.join(dir, name), "utf8"),
    }));
    const result = parseLevelTexts(entries);
    expect(result.ok, JSON.stringify(!result.ok && result.errors)).toBe(true);
    if (result.ok) expect(validateRoute(result.levels).errors).toEqual([]);
  });

  it("every route file in the folder is a valid array of levels", () => {
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".route.json"))) {
      const result = parseLevelTexts([{ name, text: readFileSync(path.join(dir, name), "utf8") }]);
      expect(result.ok, name).toBe(true);
    }
  });
});
