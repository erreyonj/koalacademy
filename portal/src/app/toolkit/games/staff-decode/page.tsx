import type { Metadata } from "next";
import { GameFullscreenShell } from "@/features/games/GameFullscreenShell";
import { StaffDecodeApp } from "@/features/staff-decode/components/StaffDecodeApp";

export const metadata: Metadata = {
  title: "Staff DeCode",
  description:
    "Crack a run of vault safes by matching each code letter to its treble staff pitch, octave register, and note subdivision.",
};

export default function StaffDecodePage() {
  return (
    <GameFullscreenShell
      title="Staff DeCode"
      bootLabel="Spinning up the vault dials"
      theme="vault"
      exitNote="Leaving ends this vault run. You can start a fresh run from Games."
    >
      <div className="sd-page">
        <StaffDecodeApp />
      </div>
    </GameFullscreenShell>
  );
}
