"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLevel, serializeLevel } from "../model";
import { clearDraft, downloadLevel, loadDraft, readLevelFile, saveDraft } from "../persist";
import { createEditorStore } from "../store";
import { PlaytestView } from "../playtest/PlaytestView";
import { handleKey } from "../tools";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { Toolbar } from "./Toolbar";

const AUTOSAVE_MS = 400;

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
  const restored = useRef(false);

  // Restore after mount so server and client render the same first frame.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) store.dispatch({ type: "load", level: draft });
    restored.current = true;
  }, [store]);

  // Autosave once a gesture is finished.
  useEffect(() => {
    if (!restored.current || state.base) return;
    const timer = window.setTimeout(() => saveDraft(state.level), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [state.level, state.base]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "Space") return;
      if (handleKey(store, { tolerance: 3 }, e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  const onImport = useCallback(
    async (file: File) => {
      const result = await readLevelFile(file);
      if (result.ok) {
        store.dispatch({ type: "load", level: result.level });
        setNotice(`Imported ${file.name}.`);
        setZoomKey((n) => n + 1);
      } else {
        setNotice(`Could not import: ${result.errors.slice(0, 3).join("; ")}`);
      }
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

  const onNew = useCallback(() => {
    if (!window.confirm("Start a new level? Export first if you want to keep this one.")) return;
    clearDraft();
    store.dispatch({ type: "load", level: createLevel() });
    setNotice(null);
    setZoomKey((n) => n + 1);
  }, [store]);

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950" data-testid="level-editor">
      <Toolbar store={store} state={state} />
      <div className="relative min-w-0 flex-1">
        <EditorCanvas store={store} state={state} zoomKey={zoomKey} />
        {state.playing && (
          <div className="absolute inset-0 bg-zinc-950">
            <PlaytestView
              level={state.level}
              session={state.play}
              dispatch={store.dispatch}
              onExit={() => store.dispatch({ type: "play", on: false })}
            />
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
        onNew={onNew}
        onFit={() => setZoomKey((n) => n + 1)}
      />
    </div>
  );
}
