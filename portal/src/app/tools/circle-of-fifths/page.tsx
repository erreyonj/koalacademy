import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { CircleOfFifths } from "@/components/circle-of-fifths/CircleOfFifths";

export const metadata: Metadata = {
  title: "Circle of Fifths",
  description:
    "Spin the circle to a key and read its triads, relative, and dominant and subdominant neighbors.",
};

export default function CircleOfFifthsPage() {
  return (
    <div className="cof-page">
      <GlassScreen>
          <LedText as="p" className="eyebrow" text="Toolkit · Theory" />
          <LedText as="h1" className="page-title" text="Circle of Fifths" />
          <LedText
            as="p"
            className="page-lede"
            text="Pick a tonic. The wheel names the key, its diatonic triads, and the neighbors that sit a fourth and a fifth away — the same map BMT.1 and BMT.3 teach from the board."
          />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <CircleOfFifths />
          <p>
            <Link className="back-link" href="/toolkit/">
              ← Toolkit
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
