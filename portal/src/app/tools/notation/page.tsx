import type { Metadata } from "next";
import Link from "next/link";
import { LedText } from "@/components/LedText";
import { NotationSandbox } from "@/components/notation/NotationSandbox";

export const metadata: Metadata = {
  title: "Notation sandbox",
  description:
    "Build a 1–2 bar staff: clef, key signature, time, notes, and rests. Download SVG or PNG for slides and worksheets.",
};

export default function NotationToolPage() {
  return (
    <div className="notation-page">
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text="Skills · Notation" />
          <LedText as="h1" className="page-title" text="Notation sandbox" />
          <LedText
            as="p"
            className="page-lede"
            text="A blank staff for 6–8 (and anyone who wants extra reps). Set the clef and key, click to place notes or rests, and download an excerpt for a slide or worksheet."
          />
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          <NotationSandbox />
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
