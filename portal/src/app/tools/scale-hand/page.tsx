import type { Metadata } from "next";
import Link from "next/link";
import { ScaleHand } from "@/components/scale-hand/ScaleHand";

export const metadata: Metadata = {
  title: "Keys.lite",
  description:
    "Watch a hand walk one octave of a chosen major or minor scale, including the thumb-under turn.",
};

export default function ScaleHandPage() {
  return (
    <div className="scale-hand-page">
      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">Toolkit · Keyboard</p>
          <h1 className="page-title">Keys.lite</h1>
          <p className="page-lede">
            One octave of the selected scale, same tonic for major or minor.
            Fingers 1 2 3, then the thumb tucks under to 1 2 3 4 5. The same
            turn <code>BMT.1</code> asks students to find on a real keyboard.
          </p>
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          <ScaleHand />
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
