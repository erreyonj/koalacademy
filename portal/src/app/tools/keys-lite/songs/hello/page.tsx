import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { SongPlayer } from "@/components/keys-lite/SongPlayer";
import { HELLO } from "@/components/keys-lite/songs";

export const metadata: Metadata = {
  title: "Hello",
  description:
    "Hello bridge loop in F minor. Left hand holds the root; right hand holds Fm, Db, Eb, Ab.",
};

export default function HelloSongPage() {
  return (
    <div className="scale-hand-page">
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keys.lite · Songs" />
        <LedText as="h1" className="page-title" text="Hello" />
        <LedText
          as="p"
          className="page-lede"
          text="Bridge cell in F minor at 80. Left hand holds F, Db, Eb, Ab. Right hand holds the matching triad. Loop the two-bar cell until the hands lock."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <SongPlayer score={HELLO} />
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
