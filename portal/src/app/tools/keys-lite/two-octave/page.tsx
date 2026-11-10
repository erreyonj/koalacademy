import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { ScaleHand } from "@/components/keys-lite/ScaleHand";

export const metadata: Metadata = {
  title: "2 Octave Scales",
  description:
    "Watch a hand walk two octaves of a chosen major or minor scale, with the thumb-under turn repeating through the second octave.",
};

export default function TwoOctavePage() {
  return (
    <div className="scale-hand-page">
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
        <LedText as="h1" className="page-title" text="2 Octave Scales" />
        <LedText
          as="p"
          className="page-lede"
          text="The same fingering walk as one octave, stretched across two. Thumb under repeats at each turn so the hand keeps climbing — then the same walk back down."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <ScaleHand octaves={2} />
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
