import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getLessonsForBand } from "@/lib/lessons";
import { BANDS } from "@/lib/types";

export default function HomePage() {
  const bands = BANDS.map((band) => ({
    ...band,
    count: getLessonsForBand(band.id).length,
  }));

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />

      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">K–8 Music Pilot</p>
          <h1 className="page-title">Today&apos;s lesson, in two taps.</h1>
          <p className="page-lede">
            Every lesson as a page you can read on a phone or throw on a projector — the
            concept, the listening, and the game.
          </p>
        </div>
      </header>

      <main id="main" className="section">
        <div className="wrap">
          <h2 className="eyebrow">Pick a grade</h2>
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
      </main>

      <SiteFooter />
    </>
  );
}
