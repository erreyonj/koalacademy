"use client";

import { useMemo } from "react";
import {
  Delete as BackspaceIcon,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Minus,
  Play,
  Plus,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  HULL_MAX,
  TONATION_CAP,
  type EditorState,
  type EditorStore,
  type ToolId,
} from "../store";
import { clampTonation } from "../../notehead/modules/tonation";
import { TOOLS, TOOL_ORDER, handleKey, switchTool } from "../tools";
import { playBlocker } from "../playtest/runtime";
import type { LayerId } from "../types";

const LAYERS: { id: LayerId; label: string }[] = [
  { id: "terrain", label: "Terrain" },
  { id: "band", label: "Bands" },
  { id: "borealis", label: "Borealis" },
  { id: "enterExit", label: "Enter / Exit" },
];

const GRIDS = [0, 2, 4, 8];

const button =
  "inline-flex items-center justify-center rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800";

/** Rows fade in with a small stagger when their panel becomes the shown one. */
function stagger(shown: boolean, index: number) {
  return { transitionDelay: shown ? `${60 + index * 35}ms` : "0ms" };
}

const MOTION = "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none";

/**
 * One of the two tool palettes. Both sit in the same grid cell; the hidden one
 * is invisible, waits off to one side, and is `inert` so it cannot be focused
 * or clicked.
 */
function Panel({
  shown,
  from,
  title,
  testId,
  children,
}: {
  shown: boolean;
  /** Which side the panel waits on while hidden. */
  from: "left" | "right";
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      data-shown={shown}
      aria-hidden={!shown}
      inert={!shown}
      className={clsx(
        "[grid-area:1/1]",
        MOTION,
        shown
          ? "translate-x-0 opacity-100"
          : clsx("pointer-events-none opacity-0", from === "left" ? "-translate-x-4" : "translate-x-4"),
      )}
    >
      <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function rowMotion(shown: boolean) {
  return clsx(MOTION, shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0");
}

function ToggleRow({
  shown,
  index,
  pressed,
  label,
  hint,
  testId,
  onClick,
}: {
  shown: boolean;
  index: number;
  pressed: boolean;
  label: string;
  hint: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-testid={testId}
      onClick={onClick}
      style={stagger(shown, index)}
      title={hint}
      className={clsx(
        "flex items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
        rowMotion(shown),
        pressed
          ? "border-sky-400 bg-sky-500/20 text-sky-100"
          : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
      )}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] uppercase text-zinc-400">{pressed ? "on" : "off"}</span>
    </button>
  );
}

/** Whole-number field that commits on blur or Enter and shows the clamped result. */
function TonationField({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  function commit(input: HTMLInputElement) {
    const typed = Number(input.value);
    if (input.value.trim() === "" || !Number.isFinite(typed)) {
      input.value = String(value);
      return;
    }
    const next = clampTonation(Math.round(typed));
    input.value = String(next);
    if (next !== value) onCommit(next);
  }
  return (
    <input
      key={value}
      type="number"
      inputMode="numeric"
      min={0}
      max={TONATION_CAP}
      step={1}
      defaultValue={value}
      data-testid="play-tonation-input"
      aria-label="Tonation amount"
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget);
      }}
      className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-right font-mono text-xs text-zinc-100"
    />
  );
}

export function Toolbar({
  store,
  state,
}: {
  store: EditorStore;
  state: EditorState;
}) {
  const env = { tolerance: 3 };
  const { options } = state;
  // The check flies the level, so skip it mid-gesture and only redo it when the level changes.
  const { level, base, playing } = state;
  const blocker = useMemo(
    () => (playing || base ? null : playBlocker(level)),
    [level, base, playing],
  );

  return (
    <div className="flex h-full w-52 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
      <section>
        <button
          type="button"
          data-testid="play-toggle"
          aria-pressed={state.playing}
          disabled={Boolean(blocker)}
          title={blocker ?? (state.playing ? "Stop playtest (Esc or P)" : "Playtest this level (P)")}
          onClick={() => store.dispatch({ type: "play", on: !state.playing })}
          className={clsx(
            "flex w-full items-center justify-between rounded border px-2 py-1.5 text-sm transition-colors duration-200 disabled:opacity-40",
            state.playing
              ? "border-amber-300 bg-amber-400/20 text-amber-100"
              : "border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
          )}
        >
          <span className="grid items-center">
            <span
              className={clsx("flex items-center gap-1.5 [grid-area:1/1]", MOTION, state.playing && "scale-90 opacity-0")}
              aria-hidden={state.playing}
            >
              <Play className="size-3.5" />
              Play
            </span>
            <span
              className={clsx("flex items-center gap-1.5 [grid-area:1/1]", MOTION, !state.playing && "scale-90 opacity-0")}
              aria-hidden={!state.playing}
            >
              <Square className="size-3.5" />
              Stop
            </span>
          </span>
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-400">P</kbd>
        </button>
        {blocker && <p className="mt-1 text-[10px] leading-snug text-zinc-500">{blocker}</p>}
      </section>

      <div className="grid" data-testid="tool-panels" data-mode={state.playing ? "play" : "sandbox"}>
        <Panel shown={!state.playing} from="left" title="Tools" testId="panel-sandbox">
          <div className="flex flex-col gap-1" role="toolbar" aria-label="Level tools">
            {TOOL_ORDER.map((id: ToolId, index) => {
              const tool = TOOLS[id];
              const active = state.tool === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  data-testid={`tool-${id}`}
                  onClick={() => switchTool(store, env, id)}
                  style={stagger(!state.playing, index)}
                  className={clsx(
                    "flex items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
                    rowMotion(!state.playing),
                    active
                      ? "border-sky-400 bg-sky-500/20 text-sky-100"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                  )}
                >
                  <span>{tool.label}</span>
                  <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                    {tool.hotkey}
                  </kbd>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel shown={state.playing} from="right" title="Playtest" testId="panel-play">
          <div className="flex flex-col gap-1" role="toolbar" aria-label="Playtest tools">
            <ToggleRow
              shown={state.playing}
              index={0}
              pressed={state.play.anachrometer}
              label="Anachrometer"
              hint="Press mid-flight to slow the world and aim from the air"
              testId="play-tool-anachrometer"
              onClick={() =>
                store.dispatch({ type: "session", patch: { anachrometer: !state.play.anachrometer } })
              }
            />
            <ToggleRow
              shown={state.playing}
              index={1}
              pressed={state.play.borealisTool}
              label="Borealis"
              hint="Click adds a gem, click a gem selects it, double-click removes it"
              testId="play-tool-borealis"
              onClick={() =>
                store.dispatch({ type: "session", patch: { borealisTool: !state.play.borealisTool } })
              }
            />
            <div
              style={stagger(state.playing, 2)}
              className={clsx(
                "flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200",
                rowMotion(state.playing),
              )}
              data-testid="play-hull-row"
            >
              <span>Hull</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  className={button}
                  aria-label="Hull minus one"
                  data-testid="play-hull-dec"
                  disabled={state.play.hull <= 0}
                  onClick={() => store.dispatch({ type: "session", patch: { hull: state.play.hull - 1 } })}
                >
                  <Minus className="size-3" />
                </button>
                <span className="w-10 text-center font-mono text-xs" data-testid="play-hull-value">
                  {state.play.hull}/{HULL_MAX}
                </span>
                <button
                  type="button"
                  className={button}
                  aria-label="Hull plus one"
                  data-testid="play-hull-inc"
                  disabled={state.play.hull >= HULL_MAX}
                  onClick={() => store.dispatch({ type: "session", patch: { hull: state.play.hull + 1 } })}
                >
                  <Plus className="size-3" />
                </button>
              </span>
            </div>
            <label
              style={stagger(state.playing, 3)}
              className={clsx(
                "flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-200",
                rowMotion(state.playing),
              )}
            >
              <span>Tonation</span>
              <TonationField
                value={state.play.tonation}
                onCommit={(tonation) => store.dispatch({ type: "session", patch: { tonation } })}
              />
            </label>
          </div>
        </Panel>
      </div>

      <div className={clsx("flex flex-col gap-4 transition-opacity duration-200 motion-reduce:transition-none", state.playing && "opacity-40")} inert={state.playing}>
      <section>
        <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">History</h2>
        <div className="flex gap-1">
          <button
            type="button"
            className={button}
            disabled={state.past.length === 0 && !state.base}
            onClick={() => store.dispatch({ type: "undo" })}
            aria-label="Undo"
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2 className="size-3.5" />
          </button>
          <button
            type="button"
            className={button}
            disabled={state.future.length === 0}
            onClick={() => store.dispatch({ type: "redo" })}
            aria-label="Redo"
            title="Redo (Shift+Ctrl/Cmd+Z)"
          >
            <Redo2 className="size-3.5" />
          </button>
          <button
            type="button"
            className={button}
            data-testid="backspace"
            disabled={!state.draft && !state.selection}
            onClick={() => handleKey(store, env, { key: "Backspace" })}
            aria-label="Backspace"
            title="Backspace: drop the last terrain point, or delete the selection"
          >
            <BackspaceIcon className="size-3.5" />
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Snapping</h2>
        <div className="mb-2 flex items-center gap-1 text-xs">
          <span className="mr-1 text-zinc-400">Grid</span>
          {GRIDS.map((g) => (
            <button
              key={g}
              type="button"
              className={clsx(button, options.grid === g && "border-sky-400 bg-sky-500/20")}
              onClick={() => store.dispatch({ type: "options", options: { ...options, grid: g } })}
            >
              {g === 0 ? "Off" : g}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Layers</h2>
        <ul className="flex flex-col gap-1">
          {LAYERS.map(({ id, label }) => {
            const layer = state.layers[id];
            return (
              <li key={id} className="flex items-center justify-between rounded bg-zinc-900 px-2 py-1 text-xs">
                <span className={clsx(!layer.visible && "text-zinc-500 line-through")}>{label}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`${layer.visible ? "Hide" : "Show"} ${label}`}
                    aria-pressed={layer.visible}
                    className="rounded p-1 hover:bg-zinc-800"
                    onClick={() => store.dispatch({ type: "layer", layer: id, patch: { visible: !layer.visible } })}
                  >
                    {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-zinc-500" />}
                  </button>
                  <button
                    type="button"
                    aria-label={`${layer.locked ? "Unlock" : "Lock"} ${label}`}
                    aria-pressed={layer.locked}
                    className="rounded p-1 hover:bg-zinc-800"
                    onClick={() => store.dispatch({ type: "layer", layer: id, patch: { locked: !layer.locked } })}
                  >
                    {layer.locked ? <Lock className="size-3.5 text-amber-300" /> : <LockOpen className="size-3.5 text-zinc-500" />}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      </div>

      <p className="mt-auto text-[10px] leading-snug text-zinc-500">
        Pan: Space-drag or middle-drag. Zoom: wheel. Ctrl/Cmd+Z undoes.
      </p>
    </div>
  );
}
