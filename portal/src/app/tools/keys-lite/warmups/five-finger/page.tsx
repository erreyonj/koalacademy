import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { FiveFingerHand } from "@/components/keys-lite/FiveFingerHand";

export const metadata: Metadata = {
  title: "Five Finger Positions",
  description:
    "Walk degrees 1–5 of a chosen key with one finger per note — a short warmup before a scale or a song.",
};

export default function FiveFingerPage() {
  return (
    <div className="scale-hand-page">
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
        <LedText as="h1" className="page-title" text="Five Finger Positions" />
        <LedText
          as="p"
          className="page-lede"
          text="Five notes. Five fingers. Thumb through pinky on degrees 1–5 of the key — no thumb-under turn. Play it before a scale or a song."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <FiveFingerHand />
          <p>
            <Link className="back-link" href="/tools/keys-lite/warmups/">
              ← Warmups
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
