import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { SongPlayer } from "@/components/keys-lite/SongPlayer";
import { HELLO } from "@/components/keys-lite/songs";

export const metadata: Metadata = {
  title: "Hello",
  description:
    "Hello in F minor. Left hand holds the root; right hand holds the triad through the full form.",
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
          text="Full form in F minor at 80. Left hand holds the bass root; right hand holds the triad. Follow the scrolling staff, then match both hands on the piano below."
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
