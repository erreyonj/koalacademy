import type { Metadata } from "next";
import { LevelEditor } from "@/features/levels/components/LevelEditor";
import { editorEnabled } from "@/features/levels/persist";

export const metadata: Metadata = {
  title: "Notehead level editor",
  robots: { index: false, follow: false },
};

/**
 * Dev-only authoring tool. The app is a static export, so in a production
 * build this route renders a notice instead of the editor.
 */
export default function NoteheadLevelEditorPage() {
  if (!editorEnabled()) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold">Level editor</h1>
        <p className="mt-2 text-sm text-neutral-600">
          The Notehead level editor only runs in local development.
        </p>
      </main>
    );
  }
  return <LevelEditor />;
}
