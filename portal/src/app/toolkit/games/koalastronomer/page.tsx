import type { Metadata } from "next";
import { GameFullscreenShell } from "@/features/games/GameFullscreenShell";
import { KoalastronomerApp } from "@/features/koalastronomer/components/KoalastronomerApp";

export const metadata: Metadata = {
  title: "Koalastronomer",
  description:
    "Restore the observatory by reconstructing damaged musical records to earn Calibration and aligning the brass telescope across the star chart.",
};

export default function KoalastronomerPage() {
  return (
    <GameFullscreenShell
      title="Koalastronomer"
      bootLabel="Warming the observatory optics"
      theme="observatory"
      exitNote="Your observatory progress is saved on this device. Pick up where you left off from Games."
    >
      <div className="koalastronomer-page">
        <KoalastronomerApp />
      </div>
    </GameFullscreenShell>
  );
}
