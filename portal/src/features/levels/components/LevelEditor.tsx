"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLevel, serializeLevel } from "../model";
import { downloadLevel, downloadRoute, loadDraft, readLevelFiles, saveDraft } from "../persist";
import { createEditorStore, exitDestination, originIndexOf, type ExitDirection } from "../store";
import { playBlocker } from "../playtest/runtime";
import { PlaytestView } from "../playtest/PlaytestView";
import { handleKey } from "../tools";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { Toolbar } from "./Toolbar";

const AUTOSAVE_MS = 400;
const TOAST_MS = 2600;

const ARROWS: Record<string, ExitDirection> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
};

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return /^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable;
}

/** Dev-only level editor. Authoring only: the game does not read these files yet. */
export function LevelEditor() {
  const [store] = useState(() => createEditorStore(createLevel()));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoomKey, setZoomKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const restored = useRef(false);

  // A short alert over the canvas for keyboard actions, which have no button to flash.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      store.dispatch({ type: "loadRoute", levels: draft.levels });
      store.dispatch({ type: "selectLevel", index: draft.activeIndex });
      if (draft.origin) store.dispatch({ type: "setOrigin", id: draft.origin });
    }
    restored.current = true;
  }, [store]);

  // Autosave once a gesture is finished.
  useEffect(() => {
    if (!restored.current || state.base) return;
    const timer = window.setTimeout(
      () => saveDraft(state.library, state.activeIndex, state.originId),
      AUTOSAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [state.library, state.activeIndex, state.originId, state.base]);

  // Opening another level re-fits the canvas to it.
  useEffect(() => {
    setZoomKey((n) => n + 1);
  }, [state.activeIndex, state.library.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "Space") return;
      // Shift+Command+arrow follows the open level's exit that faces that way.
      const direction = ARROWS[e.key];
      if (direction && e.shiftKey && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        const current = store.getState();
        if (current.playing) return;
        const target = exitDestination(current, direction);
        if ("error" in target) setToast(target.error);
        else store.dispatch({ type: "selectLevel", index: target.index });
        return;
      }
      const wasPlaying = store.getState().playing;
      if (handleKey(store, { tolerance: 3 }, e)) e.preventDefault();
      // Shift+P that did not start: say why, since there is no disabled button to hover.
      if (e.shiftKey && e.key.toLowerCase() === "p" && !wasPlaying && !store.getState().playing) {
        const now = store.getState();
        const origin = now.library[originIndexOf(now)]!;
        const reason = playBlocker(origin);
        if (reason) setToast(`${origin.id} (origin): ${reason}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const onImport = useCallback(
    async (files: File[]) => {
      const result = await readLevelFiles(files);
      if (!result.ok) {
        setNotice(`Could not import: ${result.errors.slice(0, 3).join("; ")}`);
        return;
      }
      if (
        store.getState().library.length > 1 &&
        !window.confirm("Replace the current route with the imported levels?")
      ) {
        return;
      }
      store.dispatch({ type: "loadRoute", levels: result.levels, origin: result.origin });
      const count = result.levels.length;
      setNotice(count === 1 ? `Imported ${files[0]?.name}.` : `Imported ${count} levels as a route.`);
      setZoomKey((n) => n + 1);
    },
    [store],
  );

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serializeLevel(store.getState().level));
      setNotice("Copied level JSON.");
    } catch {
      setNotice("Clipboard is not available here. Use Export JSON instead.");
    }
  }, [store]);

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950" data-testid="level-editor">
      <Toolbar store={store} state={state} />
      <div className="relative min-w-0 flex-1">
        <EditorCanvas store={store} state={state} zoomKey={zoomKey} />
        {state.playing && (
          <div className="absolute inset-0 bg-zinc-950">
            <PlaytestView
              levels={state.library}
              startIndex={state.playFrom}
              session={state.play}
              dispatch={store.dispatch}
              onExit={() => store.dispatch({ type: "play", on: false })}
            />
          </div>
        )}
        {toast && (
          <div
            role="alert"
            data-testid="editor-toast"
            className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded border border-amber-400/60 bg-zinc-900/95 px-3 py-1.5 text-xs text-amber-200 shadow"
          >
            {toast}
          </div>
        )}
      </div>
      <Inspector
        store={store}
        state={state}
        notice={notice}
        onExport={() => {
          downloadLevel(state.level);
          setNotice("Exported. Commit the file to portal/src/features/notehead/levels/.");
        }}
        onImport={onImport}
        onCopy={onCopy}
        onExportRoute={() => {
          downloadRoute(state.library, state.originId);
          setNotice("Exported the route as one file.");
        }}
        onFit={() => setZoomKey((n) => n + 1)}
      />
    </div>
  );
}
