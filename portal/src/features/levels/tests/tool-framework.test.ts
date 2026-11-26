import { describe, expect, it } from "vitest";
import { TOOLS, TOOL_ORDER } from "../tools";
import { harness, v } from "./harness";

describe("tool framework", () => {
  it("registers every tool once under its own id and hotkey", () => {
    expect(TOOL_ORDER).toHaveLength(5);
    const hotkeys = new Set<string>();
    for (const id of TOOL_ORDER) {
      expect(TOOLS[id].id).toBe(id);
      hotkeys.add(TOOLS[id].hotkey);
    }
    expect(hotkeys.size).toBe(5);
    expect([...hotkeys].sort()).toEqual(["b", "e", "r", "t", "v"]);
  });

  it("switches tools from hotkeys and ignores modified keys", () => {
    const h = harness();
    expect(h.key("t")).toBe(true);
    expect(h.state.tool).toBe("terrain");
    h.key("b");
    expect(h.state.tool).toBe("band");
    h.key("r");
    expect(h.state.tool).toBe("borealis");
    h.key("e");
    expect(h.state.tool).toBe("enter-exit");
    h.key("v");
    expect(h.state.tool).toBe("select");
    h.key("t", { ctrlKey: true });
    expect(h.state.tool).toBe("select");
    h.key("t", { altKey: true });
    expect(h.state.tool).toBe("select");
  });

  it("undoes and redoes from keys", () => {
    const h = harness();
    h.tool("borealis");
    h.click(v(100, 100));
    expect(h.level.borealis).toHaveLength(1);
    h.key("z", { ctrlKey: true });
    expect(h.level.borealis).toHaveLength(0);
    h.key("z", { ctrlKey: true, shiftKey: true });
    expect(h.level.borealis).toHaveLength(1);
    h.key("z", { ctrlKey: true });
    h.key("y", { ctrlKey: true });
    expect(h.level.borealis).toHaveLength(1);
  });

  it("Esc cancels a drag, restoring the level from before it", () => {
    const h = harness();
    h.tool("borealis");
    h.click(v(100, 100));
    const before = h.level;
    h.tool("select");
    h.down(v(100, 100));
    h.move(v(140, 140));
    expect(h.level).not.toBe(before);
    h.key("Escape");
    expect(h.level).toBe(before);
    expect(h.state.gesture).toBeNull();
    expect(h.state.base).toBeNull();
  });

  it("a tool switch cancels an in-flight drag", () => {
    const h = harness();
    h.tool("borealis");
    h.click(v(100, 100));
    const before = h.level;
    h.tool("select");
    h.down(v(100, 100));
    h.move(v(140, 140));
    h.tool("terrain");
    expect(h.level).toBe(before);
    expect(h.state.gesture).toBeNull();
  });

  it("Esc on an idle canvas clears the selection", () => {
    const h = harness();
    h.tool("borealis");
    h.click(v(100, 100));
    expect(h.state.selection).not.toBeNull();
    h.key("Escape");
    expect(h.state.selection).toBeNull();
  });

  it("a locked layer takes no edits and a hidden layer cannot be picked", () => {
    const h = harness();
    h.store.dispatch({ type: "layer", layer: "borealis", patch: { locked: true } });
    h.tool("borealis");
    h.click(v(100, 100));
    expect(h.level.borealis).toHaveLength(0);

    h.store.dispatch({ type: "layer", layer: "borealis", patch: { locked: false } });
    h.click(v(100, 100));
    expect(h.level.borealis).toHaveLength(1);

    h.store.dispatch({ type: "layer", layer: "borealis", patch: { visible: false } });
    h.tool("select");
    h.click(v(100, 100));
    expect(h.state.selection).toBeNull();
  });

  it("each completed gesture is one undoable step", () => {
    const h = harness();
    h.tool("band");
    h.drag(v(40, 200), v(100, 200));
    expect(h.undoDepth).toBe(1);
    h.tool("select");
    const band = h.level.bands[0]!;
    const mid = { x: (band.x0 + band.x1) / 2, y: band.y };
    h.drag(mid, { x: mid.x + 60, y: mid.y });
    expect(h.undoDepth).toBe(2);
  });
});
