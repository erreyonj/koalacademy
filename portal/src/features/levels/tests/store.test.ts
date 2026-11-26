import { describe, expect, it } from "vitest";
import { addBand, createLevel } from "../model";
import { createEditorStore } from "../store";

const band = {
  id: "band-1",
  x0: 100,
  x1: 200,
  y: 500,
  kind: "band" as const,
};

describe("editor store", () => {
  it("commits an edit as one undo step and redoes it", () => {
    const store = createEditorStore();
    const first = addBand(store.getState().level, band);
    store.dispatch({ type: "edit", level: first });
    expect(store.getState().level.bands).toHaveLength(1);

    store.dispatch({ type: "undo" });
    expect(store.getState().level.bands).toHaveLength(0);
    store.dispatch({ type: "redo" });
    expect(store.getState().level.bands).toHaveLength(1);
  });

  it("collapses a live drag into a single undo step", () => {
    const store = createEditorStore();
    store.dispatch({ type: "edit", level: addBand(store.getState().level, band) });
    const start = store.getState().level;

    for (const x of [110, 120, 130]) {
      store.dispatch({
        type: "edit",
        live: true,
        level: { ...start, bands: [{ ...band, x0: x }] },
      });
    }
    expect(store.getState().past).toHaveLength(1);
    store.dispatch({ type: "endEdit" });
    expect(store.getState().past).toHaveLength(2);
    expect(store.getState().level.bands[0]!.x0).toBe(130);

    store.dispatch({ type: "undo" });
    expect(store.getState().level.bands[0]!.x0).toBe(100);
  });

  it("cancelEdit restores the level from before the gesture", () => {
    const store = createEditorStore();
    store.dispatch({ type: "edit", level: addBand(store.getState().level, band) });
    const start = store.getState().level;
    store.dispatch({
      type: "edit",
      live: true,
      level: { ...start, bands: [{ ...band, x0: 150 }] },
    });
    store.dispatch({ type: "cancelEdit" });
    expect(store.getState().level).toBe(start);
    expect(store.getState().base).toBeNull();
  });

  it("clears redo history on a new edit and ignores no-op edits", () => {
    const store = createEditorStore();
    const withBand = addBand(store.getState().level, band);
    store.dispatch({ type: "edit", level: withBand });
    store.dispatch({ type: "undo" });
    store.dispatch({ type: "edit", level: addBand(createLevel(), { ...band, id: "band-2" }) });
    expect(store.getState().future).toHaveLength(0);

    const before = store.getState().past.length;
    store.dispatch({ type: "edit", level: store.getState().level });
    expect(store.getState().past).toHaveLength(before);
  });

  it("drops a selection when its item is undone away", () => {
    const store = createEditorStore();
    store.dispatch({ type: "edit", level: addBand(store.getState().level, band) });
    store.dispatch({ type: "select", selection: { kind: "band", id: "band-1" } });
    store.dispatch({ type: "undo" });
    expect(store.getState().selection).toBeNull();
  });

  it("load resets history", () => {
    const store = createEditorStore();
    store.dispatch({ type: "edit", level: addBand(store.getState().level, band) });
    store.dispatch({ type: "load", level: createLevel("other") });
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().level.id).toBe("other");
  });

  it("toggles layer visibility and lock independently", () => {
    const store = createEditorStore();
    store.dispatch({ type: "layer", layer: "terrain", patch: { locked: true } });
    expect(store.getState().layers.terrain).toEqual({ visible: true, locked: true });
    store.dispatch({ type: "layer", layer: "terrain", patch: { visible: false } });
    expect(store.getState().layers.terrain).toEqual({ visible: false, locked: true });
  });

  it("notifies subscribers", () => {
    const store = createEditorStore();
    let calls = 0;
    const off = store.subscribe(() => (calls += 1));
    store.dispatch({ type: "setTool", tool: "band" });
    off();
    store.dispatch({ type: "setTool", tool: "terrain" });
    expect(calls).toBe(1);
  });
});
