import type { Metadata } from "next";
import Link from "next/link";
import { RhythmRandomizer } from "@/components/notation/RhythmRandomizer";

export const metadata: Metadata = {
  title: "Rhythm randomizer",
  description:
    "Pick a time signature and bar count, then generate a random 1–4 bar rhythm for drills and worksheets.",
};

export default function RhythmToolPage() {
  return (
    <div className="notation-page">
      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">Skills · Rhythm</p>
          <h1 className="page-title">Rhythm randomizer</h1>
          <p className="page-lede">
            Choose a meter and how many bars, then generate. Each beat rolls a
            quarter, two eighths, or a rest — the same cells{" "}
            <code>NOTATE</code> and <code>BMT.4</code> drill on paper.
          </p>
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          <RhythmRandomizer />
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
