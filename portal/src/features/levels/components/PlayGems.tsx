"use client";

import { clsx } from "clsx";
import type { EditorState, EditorStore } from "../store";
import { BorealisPitchSelect, NumberField, Row, Section, button } from "./fields";

/**
 * Playtest-only Borealis: the ones added with the cursor while playing. They
 * live in the play session, not the level file, so they are gone when the
 * playtest stops. Edits here move the gem in the running flight.
 */
export function PlayGems({ store, state }: { store: EditorStore; state: EditorState }) {
  const { extraBorealis, selectedGem } = state.play;
  const selected = extraBorealis.find((gem) => gem.id === selectedGem) ?? null;

  return (
    <Section title="Playtest Borealis">
      <p className="text-[10px] leading-snug text-zinc-500">
        Added during play and not saved to the level. Use the Borealis cursor: click adds, click a gem
        selects it, double-click removes it.
      </p>
      <Row label="New gem pitch">
        <BorealisPitchSelect
          value={state.play.gemPitch}
          testId="play-new-gem-pitch"
          onChange={(gemPitch) => store.dispatch({ type: "session", patch: { gemPitch } })}
        />
      </Row>
      {extraBorealis.length === 0 ? (
        <p className="text-xs text-zinc-500" data-testid="play-gems-empty">
          None added yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="play-gems">
          {extraBorealis.map((gem) => (
            <li key={gem.id}>
              <button
                type="button"
                data-testid={`play-gem-${gem.id}`}
                aria-pressed={gem.id === selectedGem}
                onClick={() => store.dispatch({ type: "session", patch: { selectedGem: gem.id } })}
                className={clsx(
                  "flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs",
                  gem.id === selectedGem
                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                )}
              >
                <span className="font-mono">{gem.id}</span>
                <span className="text-zinc-400">{gem.pitch}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="flex flex-col gap-2" data-testid="play-gem-details">
          <Row label="Pitch">
            <BorealisPitchSelect
              value={selected.pitch}
              testId="play-gem-pitch"
              onChange={(pitch) =>
                store.dispatch({ type: "gem", op: "patch", id: selected.id, patch: { pitch } })
              }
            />
          </Row>
          <NumberField
            label="x"
            value={selected.x}
            onCommit={(x) => store.dispatch({ type: "gem", op: "patch", id: selected.id, patch: { x } })}
          />
          <NumberField
            label="y"
            value={selected.y}
            onCommit={(y) => store.dispatch({ type: "gem", op: "patch", id: selected.id, patch: { y } })}
          />
          <button
            type="button"
            className={button}
            data-testid="play-gem-delete"
            onClick={() => store.dispatch({ type: "gem", op: "remove", id: selected.id })}
          >
            Delete
          </button>
        </div>
      )}
      {extraBorealis.length > 0 && (
        <button
          type="button"
          className={button}
          data-testid="play-gems-clear"
          onClick={() => store.dispatch({ type: "gem", op: "clear" })}
        >
          Clear added
        </button>
      )}
    </Section>
  );
}
