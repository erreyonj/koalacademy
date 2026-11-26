"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { GripVertical, X } from "lucide-react";
import type { EditorState, EditorStore } from "../store";

/**
 * The route, as a list of level ids. Click a row to open that level, drag a
 * row to reorder, press the cross to remove it from the route.
 */
export function RouteList({ store, state }: { store: EditorStore; state: EditorState }) {
  const { library, activeIndex } = state;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const end = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  return (
    <ol className="flex flex-col gap-0.5" data-testid="route-list" aria-label="Route levels">
      {library.map((level, i) => (
        <li
          key={level.id}
          draggable
          data-testid="route-row"
          data-level-id={level.id}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", level.id);
            setDragFrom(i);
          }}
          onDragOver={(e) => {
            if (dragFrom === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropAt(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null) store.dispatch({ type: "moveLevel", from: dragFrom, to: i });
            end();
          }}
          onDragEnd={end}
          className={clsx(
            "flex items-center gap-1 rounded border px-1 py-0.5 text-xs",
            i === activeIndex
              ? "border-sky-400 bg-sky-500/20 text-zinc-50"
              : "border-zinc-800 bg-zinc-900 text-zinc-300",
            dragFrom === i && "opacity-40",
            dropAt === i &&
              dragFrom !== null &&
              dragFrom !== i &&
              (dragFrom < i ? "border-b-2 border-b-amber-300" : "border-t-2 border-t-amber-300"),
          )}
        >
          <GripVertical aria-hidden className="h-3.5 w-3.5 shrink-0 cursor-grab text-zinc-500" />
          <span className="w-4 shrink-0 text-right font-mono text-[10px] text-zinc-500">{i + 1}</span>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left font-mono"
            aria-current={i === activeIndex ? "true" : undefined}
            onClick={() => store.dispatch({ type: "selectLevel", index: i })}
          >
            {level.id}
          </button>
          <button
            type="button"
            aria-label={`Remove ${level.id} from the route`}
            title="Remove from route"
            disabled={library.length <= 1}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
            onClick={() => {
              if (!window.confirm(`Remove "${level.id}" from the route? Export it first to keep a copy.`)) return;
              store.dispatch({ type: "removeLevel", index: i });
            }}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ol>
  );
}
