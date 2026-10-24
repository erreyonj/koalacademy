import Link from "next/link";
import type { Metadata } from "next";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { getLessonsForBand } from "@/lib/lessons";
import { BANDS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Lessons",
};

export default function LessonsHomePage() {
  const bands = BANDS.map((band) => ({
    ...band,
    count: getLessonsForBand(band.id).length,
  }));

  return (
    <>
      <GlassScreen>
          <LedText as="p" className="eyebrow" text="Lessons" />
          <LedText as="h1" className="page-title" text="Pick a grade." />
          <LedText
            as="p"
            className="page-lede"
            text="Every lesson as a page you can read on a phone or throw on a projector — the concept, the listening, and the game."
          />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <h2 className="eyebrow">Grade bands</h2>
          <ul className="band-grid" role="list">
            {bands.map((band) => (
              <li key={band.id}>
                <Link
                  className={`band-card ${
                    band.track === "unplugged" ? "band-card-unplugged" : "band-card-device"
                  }`}
                  href={`/grades/${band.id}/`}
                >
                  <span className="band-card-label">{band.short}</span>
                  <span className="band-card-meta">
                    {band.count} {band.count === 1 ? "lesson" : "lessons"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
