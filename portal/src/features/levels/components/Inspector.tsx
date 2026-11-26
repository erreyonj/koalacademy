"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { C_MAJOR, type LedgeKind } from "../../notehead/modules/sim";
import {
  bandById,
  borealisById,
  exitById,
  flipTerrain,
  hashSeed,
  patchBand,
  patchBorealis,
  patchExit,
  patchTerrain,
  reorderBorealis,
  round2,
  setEnter,
  terrainById,
  validateLevel,
} from "../model";
import type { EditorState, EditorStore } from "../store";
import { deleteSelection } from "../tools";
import { axisOf, exitRange, openingFor } from "../tools/gestures";
import type { LevelFile, PitchName } from "../types";

import { PlayGems } from "./PlayGems";
import { RouteConfig, ExitTargetSelect } from "./RouteConfig";
import { RouteList } from "./RouteList";
import { BorealisPitchSelect, NumberField, Row, Section, button, field, select } from "./fields";

const KINDS: LedgeKind[] = ["band", "step", "block"];

export function Inspector({
  store,
  state,
  notice,
  onExport,
  onImport,
  onExportRoute,
  onCopy,
  onFit,
}: {
  store: EditorStore;
  state: EditorState;
  notice: string | null;
  onExport: () => void;
  onImport: (files: File[]) => void;
  onExportRoute: () => void;
  onCopy: () => void;
  onFit: () => void;
}) {
  const { level, selection, options } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const errors = useMemo(() => validateLevel(level), [level]);
  const edit = (next: LevelFile) => store.dispatch({ type: "edit", level: next });
  const setOptions = (next: typeof options) => store.dispatch({ type: "options", options: next });
  const [idText, setIdText] = useState(level.id);
  useEffect(() => setIdText(level.id), [level.id]);
  const [idError, setIdError] = useState<string | null>(null);
  useEffect(() => setIdError(null), [level.id]);

  const sel = (() => {
    if (!selection) return null;
    switch (selection.kind) {
      case "terrain": {
        const shape = terrainById(level, selection.id);
        if (!shape) return null;
        const v = selection.vertex !== undefined ? shape.points[selection.vertex] : undefined;
        return (
          <Section title={`Terrain ${shape.id}`}>
            <p className="text-xs text-zinc-400">
              {shape.points.length} points, {shape.closed ? "closed ring" : "open line"}.
              {!shape.closed && " The rock fills to the right of the drawing direction."}
            </p>
            <Row label="Closed ring">
              <input
                type="checkbox"
                checked={shape.closed}
                disabled={!shape.closed && shape.points.length < 3}
                onChange={(e) => edit(patchTerrain(level, shape.id, { closed: e.target.checked }))}
              />
            </Row>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={button} onClick={() => edit(flipTerrain(level, shape.id))}>
                Flip side (F)
              </button>
              <button
                type="button"
                className={button}
                onClick={() =>
                  edit(patchTerrain(level, shape.id, { tickSeed: hashSeed(`${shape.id}:${shape.tickSeed}`) }))
                }
              >
                Reseed marks
              </button>
            </div>
            <NumberField
              label="Seed"
              value={shape.tickSeed}
              onCommit={(n) => edit(patchTerrain(level, shape.id, { tickSeed: Math.max(0, Math.floor(n)) }))}
            />
            {v && selection.vertex !== undefined && (
              <>
                <p className="text-xs text-zinc-400">Vertex {selection.vertex + 1}</p>
                <NumberField
                  label="x"
                  value={v.x}
                  onCommit={(n) =>
                    edit(
                      patchTerrain(level, shape.id, {
                        points: shape.points.map((p, i) => (i === selection.vertex ? { ...p, x: n } : p)),
                      }),
                    )
                  }
                />
                <NumberField
                  label="y"
                  value={v.y}
                  onCommit={(n) =>
                    edit(
                      patchTerrain(level, shape.id, {
                        points: shape.points.map((p, i) => (i === selection.vertex ? { ...p, y: n } : p)),
                      }),
                    )
                  }
                />
              </>
            )}
          </Section>
        );
      }
      case "band": {
        const band = bandById(level, selection.id);
        if (!band) return null;
        return (
          <Section title={`Band ${band.id}`}>
            <Row label="Kind">
              <select
                className={select}
                value={band.kind}
                onChange={(e) => edit(patchBand(level, band.id, { kind: e.target.value as LedgeKind }))}
              >
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Row>
            <NumberField label="x0" value={band.x0} onCommit={(n) => n < band.x1 && edit(patchBand(level, band.id, { x0: n }))} />
            <NumberField label="x1" value={band.x1} onCommit={(n) => n > band.x0 && edit(patchBand(level, band.id, { x1: n }))} />
            <NumberField label="y (mid)" value={band.y} onCommit={(n) => edit(patchBand(level, band.id, { y: n }))} />
            <NumberField
              label="slope"
              value={band.slope ?? 0}
              onCommit={(n) => {
                const { slope: _drop, ...rest } = band;
                void _drop;
                edit({
                  ...level,
                  bands: level.bands.map((b) => (b.id === band.id ? { ...rest, ...(n === 0 ? {} : { slope: n }) } : b)),
                });
              }}
            />
          </Section>
        );
      }
      case "borealis": {
        const gem = borealisById(level, selection.id);
        if (!gem) return null;
        const index = level.borealis.findIndex((g) => g.id === gem.id);
        return (
          <Section title={`Borealis ${gem.id}`}>
            <Row label="Pitch">
              <BorealisPitchSelect value={gem.pitch} onChange={(p) => edit(patchBorealis(level, gem.id, { pitch: p }))} />
            </Row>
            <NumberField label="x" value={gem.x} onCommit={(n) => edit(patchBorealis(level, gem.id, { x: n }))} />
            <NumberField label="y" value={gem.y} onCommit={(n) => edit(patchBorealis(level, gem.id, { y: n }))} />
            <Row label={`Order ${index + 1} of ${level.borealis.length}`}>
              <span className="flex gap-1">
                <button type="button" className={button} disabled={index === 0} onClick={() => edit(reorderBorealis(level, gem.id, index - 1))}>
                  Earlier
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={index === level.borealis.length - 1}
                  onClick={() => edit(reorderBorealis(level, gem.id, index + 1))}
                >
                  Later
                </button>
              </span>
            </Row>
          </Section>
        );
      }
      case "exit": {
        const exit = exitById(level, selection.id);
        if (!exit) return null;
        const { lo, hi } = exitRange(exit);
        const axis = axisOf(exit.facing);
        return (
          <Section title={`Exit ${exit.id} (${exit.facing})`}>
            <NumberField
              label={`${axis} from`}
              value={lo}
              onCommit={(n) => n < hi && edit(patchExit(level, exit.id, openingFor(exit.facing, n, hi)))}
            />
            <NumberField
              label={`${axis} to`}
              value={hi}
              onCommit={(n) => n > lo && edit(patchExit(level, exit.id, openingFor(exit.facing, lo, n)))}
            />
            <Row label="Goes to">
              <ExitTargetSelect
                exit={exit}
                library={state.library}
                self={level.id}
                testId="exit-target"
                onChange={(to) => edit(patchExit(level, exit.id, { to }))}
              />
            </Row>
          </Section>
        );
      }
      case "enter": {
        const en = level.enter;
        if (!en) return null;
        return (
          <Section title="Enter point">
            <NumberField label="x" value={en.x} onCommit={(n) => edit(setEnter(level, { ...en, x: n }))} />
            <NumberField label="y" value={en.y} onCommit={(n) => edit(setEnter(level, { ...en, y: n }))} />
            <NumberField label="vx" value={en.vx} onCommit={(n) => edit(setEnter(level, { ...en, vx: n }))} />
            <NumberField label="vy" value={en.vy} onCommit={(n) => edit(setEnter(level, { ...en, vy: n }))} />
          </Section>
        );
      }
    }
  })();

  return (
    <div className="flex h-full w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
      {state.playing && <PlayGems store={store} state={state} />}
      {/* Level editing is frozen while playing; the section above is not. */}
      <div className={clsx("flex flex-col gap-3", state.playing && "opacity-40")} inert={state.playing}>
      <Section title="Level">
        <Row label="Id">
          <input
            className={clsx(field, "w-36 text-left")}
            value={idText}
            onChange={(e) => setIdText(e.target.value)}
            onBlur={() => {
              const next = idText.trim();
              if (next && next !== level.id) {
                if (state.library.some((l) => l.id === next)) {
                  setIdError(`Another level already uses "${next}".`);
                  setIdText(level.id);
                } else {
                  setIdError(null);
                  edit({ ...level, id: next });
                }
              } else setIdText(level.id);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </Row>
        {idError && <p className="text-[10px] text-amber-300">{idError}</p>}
        <Row label="View">
          <select
            className={select}
            value={level.view}
            onChange={(e) => edit({ ...level, view: e.target.value as LevelFile["view"] })}
          >
            <option value="portrait">portrait 200x360</option>
            <option value="landscape">landscape 360x200</option>
          </select>
        </Row>
        <p className="text-[10px] leading-snug text-zinc-500">
          Changing the view keeps logical coordinates, so shapes re-project.
        </p>
        <p className="text-xs text-zinc-400">
          {level.terrain.length} terrain, {level.bands.length} bands, {level.borealis.length} Borealis,{" "}
          {level.exits.length} exits, enter {level.enter ? "set" : "missing"}.
        </p>
      </Section>

      <Section title="Route">
        <RouteConfig store={store} state={state} />
      </Section>

      {state.tool === "band" && (
        <Section title="Band tool options">
          <Row label="Kind">
            <select
              className={select}
              value={options.band.kind}
              onChange={(e) => setOptions({ ...options, band: { ...options.band, kind: e.target.value as LedgeKind } })}
            >
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Row>
        </Section>
      )}
      {state.tool === "borealis" && (
        <Section title="Borealis tool options">
          <Row label="Pitch">
            <BorealisPitchSelect value={options.borealis.pitch} onChange={(p) => setOptions({ ...options, borealis: { pitch: p } })} />
          </Row>
        </Section>
      )}
      {state.tool === "enter-exit" && (
        <Section title="Enter / Exit mode">
          <div className="flex gap-1">
            {(["enter", "exit"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={options.enterExit.mode === mode}
                className={clsx(button, options.enterExit.mode === mode && "border-sky-400 bg-sky-500/20")}
                onClick={() => setOptions({ ...options, enterExit: { mode } })}
              >
                {mode}
              </button>
            ))}
          </div>
        </Section>
      )}

      {sel ?? (
        <p className="text-xs text-zinc-500">Nothing selected. Use Select (V) and click an item.</p>
      )}
      {selection && sel && (
        <button type="button" className={button} onClick={() => deleteSelection(store, { tolerance: 3 })}>
          Delete selection
        </button>
      )}

      <Section title="File">
        <RouteList store={store} state={state} />
        <div className="flex flex-wrap gap-1">
          <button type="button" className={button} onClick={() => store.dispatch({ type: "addLevel" })}>
            Add level
          </button>
          <button type="button" className={button} onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <button type="button" className={button} onClick={onExport}>
            Export JSON
          </button>
          <button
            type="button"
            className={button}
            disabled={state.library.length < 2}
            onClick={onExportRoute}
          >
            Export route
          </button>
          <button type="button" className={button} onClick={onCopy}>
            Copy JSON
          </button>
          <button type="button" className={button} onClick={onFit}>
            Fit view
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          data-testid="import-input"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onImport(files);
            e.target.value = "";
          }}
        />
        <p className="text-[10px] leading-snug text-zinc-500">
          Import takes level files or array files and replaces the route. Autosaves in this browser. Commit exported files to portal/src/features/notehead/levels/.
        </p>
        {notice && <p className="text-xs text-amber-300">{notice}</p>}
      </Section>

      <Section title={errors.length === 0 ? "Checks" : `Problems (${errors.length})`}>
        {errors.length === 0 ? (
          <p className="text-xs text-emerald-300">Level file is valid.</p>
        ) : (
          <ul className="list-disc pl-4 text-xs text-red-300">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        {!level.enter && <p className="text-xs text-zinc-400">No enter point yet.</p>}
        {level.exits.length === 0 && <p className="text-xs text-zinc-400">No exit yet.</p>}
      </Section>
      </div>
    </div>
  );
}
