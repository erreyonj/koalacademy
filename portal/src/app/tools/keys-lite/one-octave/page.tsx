import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { ScaleHand } from "@/components/keys-lite/ScaleHand";

export const metadata: Metadata = {
  title: "1 Octave Scales",
  description:
    "Watch a hand walk one octave of a chosen major or minor scale, including the thumb-under turn.",
};

export default function OneOctavePage() {
  return (
    <div className="scale-hand-page">
      <GlassScreen>
          <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
          <LedText as="h1" className="page-title" text="1 Octave Scales" />
          <LedText
            as="p"
            className="page-lede"
            text="One octave of the selected scale, same tonic for major or minor. Fingers 1 2 3, then the thumb tucks under to 1 2 3 4 5. The same turn BMT.1 asks students to find on a real keyboard."
          />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <ScaleHand />
          <p>
            <Link className="back-link" href="/tools/keys-lite/">
              ← Keys.lite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
