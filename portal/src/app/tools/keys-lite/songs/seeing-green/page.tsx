import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { SongPlayer } from "@/components/keys-lite/SongPlayer";
import { SEEING_GREEN } from "@/components/keys-lite/songs";

export const metadata: Metadata = {
  title: "Seeing Green",
  description:
    "Seeing Green loop. Left hand holds the root; right hand holds Gm, F, Eb, F.",
};

export default function SeeingGreenSongPage() {
  return (
    <div className="scale-hand-page">
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keys.lite · Songs" />
        <LedText as="h1" className="page-title" text="Seeing Green" />
        <LedText
          as="p"
          className="page-lede"
          text="Four half notes at 77. Left hand holds G, F, Eb, F. Right hand holds Gm, F, Eb, F. Loop until both hands feel steady."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <SongPlayer score={SEEING_GREEN} />
          <p>
            <Link className="back-link" href="/tools/keys-lite/songs/">
              ← Songs
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
