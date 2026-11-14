import type { Metadata } from "next";
import { GameFullscreenShell } from "@/features/games/GameFullscreenShell";
import { NoteheadApp } from "@/features/notehead/components/NoteheadApp";

export const metadata: Metadata = {
  title: "Notehead",
  description:
    "Calibrate a notehead ship by slingshotting it to a goal pitch at the apex of its flight.",
};

export default function NoteheadPage() {
  return (
    <GameFullscreenShell
      title="Notehead"
      bootLabel="Warming the launch band"
      theme="field"
      exitNote="This sandbox keeps the ship at the launch site. You can return anytime from Games."
    >
      <NoteheadApp />
    </GameFullscreenShell>
  );
}
