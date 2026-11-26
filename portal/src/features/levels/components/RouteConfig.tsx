"use client";

import { button, select } from "./fields";
import { patchExit } from "../model";
import type { EditorState, EditorStore } from "../store";
import type { ExitOpening, LevelFile } from "../types";

const NONE = "";

/** Dropdown of the level ids an exit can lead to. Empty means a dead end. */
export function ExitTargetSelect({
  exit,
  library,
  self,
  onChange,
  testId,
}: {
  exit: ExitOpening;
  library: readonly LevelFile[];
  self: string;
  onChange: (to: string | undefined) => void;
  testId?: string;
}) {
  const known = exit.to === undefined || library.some((l) => l.id === exit.to);
  return (
    <select
      className={select}
      value={exit.to ?? NONE}
      data-testid={testId}
      aria-label={`Level exit ${exit.id} goes to`}
      onChange={(e) => onChange(e.target.value === NONE ? undefined : e.target.value)}
    >
      <option value={NONE}>dead end</option>
      {!known && <option value={exit.to}>{exit.to} (missing)</option>}
      {library.map((l) => (
        <option key={l.id} value={l.id}>
          {l.id}
          {l.id === self ? " (this level)" : ""}
        </option>
      ))}
    </select>
  );
}

/** Where each exit of the open level leads, plus a one click link by order. */
export function RouteConfig({ store, state }: { store: EditorStore; state: EditorState }) {
  const { level, library, activeIndex } = state;

  const link = () => {
    const next = library[activeIndex + 1];
    const prev = library[activeIndex - 1];
    let out = level;
    for (const exit of level.exits) {
      if (exit.to !== undefined) continue;
      const target = exit.facing === "down" ? prev : next;
      if (target) out = patchExit(out, exit.id, { to: target.id });
    }
    if (out !== level) store.dispatch({ type: "edit", level: out });
  };

  return (
    <div className="flex flex-col gap-2" data-testid="route-config">
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-zinc-400">Set Origin</span>
        <select
          className={select}
          value={state.originId ?? NONE}
          data-testid="route-origin"
          aria-label="Level the route begins on"
          onChange={(e) =>
            store.dispatch({ type: "setOrigin", id: e.target.value === NONE ? null : e.target.value })
          }
        >
          <option value={NONE}>first level</option>
          {library.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id}
              {l.id === level.id ? " (this level)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[10px] leading-snug text-zinc-500">
        The level the route begins on, even out of order. Shift+P plays from here; P plays the open level.
      </p>
      <p className="text-xs text-zinc-400">
        Level {activeIndex + 1} of {library.length}
      </p>
      {level.exits.length === 0 ? (
        <p className="text-[10px] leading-snug text-zinc-500">No exits yet, so nothing to link.</p>
      ) : (
        level.exits.map((exit) => {
          const dangling = exit.to !== undefined && !library.some((l) => l.id === exit.to);
          return (
            <div key={exit.id} className="flex flex-col gap-0.5">
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">
                  {exit.id} ({exit.facing}) goes to
                </span>
                <ExitTargetSelect
                  exit={exit}
                  library={library}
                  self={level.id}
                  onChange={(to) => store.dispatch({ type: "edit", level: patchExit(level, exit.id, { to }) })}
                />
              </label>
              {dangling && (
                <p className="text-[10px] text-amber-300">
                  No level named &quot;{exit.to}&quot; in this route. Playing it resets the level.
                </p>
              )}
            </div>
          );
        })
      )}
      {level.exits.some((e) => e.to === undefined) && library.length > 1 && (
        <button type="button" className={button} onClick={link}>
          Auto-link by order
        </button>
      )}
      <p className="text-[10px] leading-snug text-zinc-500">
        An exit with a target is always open. An exit with no target clears the level once every Borealis is collected.
        Shift+Command+arrow opens the level that exit leads to.
      </p>
    </div>
  );
}
