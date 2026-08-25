import type { Metadata } from "next";
import Link from "next/link";
import { CircleOfFifths } from "@/components/circle-of-fifths/CircleOfFifths";

export const metadata: Metadata = {
  title: "Circle of Fifths",
  description:
    "Spin the circle to a key and read its triads, relative, and dominant and subdominant neighbors.",
};

export default function CircleOfFifthsPage() {
  return (
    <div className="cof-page">
      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">Toolkit · Theory</p>
          <h1 className="page-title">Circle of Fifths</h1>
          <p className="page-lede">
            Pick a tonic. The wheel names the key, its diatonic triads, and the
            neighbors that sit a fourth and a fifth away — the same map{" "}
            <code>BMT.1</code> and <code>BMT.3</code> teach from the board.
          </p>
        </div>
      </header>

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
