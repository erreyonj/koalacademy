import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getBand, getLessonsForBand } from "@/lib/lessons";
import { BAND_IDS, type BandId } from "@/lib/types";

interface PageProps {
  params: Promise<{ band: string }>;
}

export function generateStaticParams() {
  return BAND_IDS.map((band) => ({ band }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { band: bandId } = await params;
  const band = getBand(bandId);
  return { title: band ? band.label : "Lessons" };
}

export default async function BandPage({ params }: PageProps) {
  const { band: bandId } = await params;
  const band = getBand(bandId);
  if (!band) notFound();

  const lessons = getLessonsForBand(band.id as BandId);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader activeBand={band.id} />

      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">
            {band.track === "unplugged" ? "Unplugged" : "Koalacademy production"}
          </p>
          <h1 className="page-title">{band.label}</h1>
          <p className="page-lede">{band.blurb}</p>
        </div>
      </header>

      <main id="main" className="section">
        <div className="wrap">
          {lessons.length === 0 ? (
            <div className="empty-note">
              <p>
                No slides written for this band yet. Lessons appear here as they are added
                to <code>content/lessons/</code>.
              </p>
            </div>
          ) : (
            <ul className="lesson-list" role="list">
              {lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link className="lesson-row" href={`/lessons/${lesson.slug}/`}>
                    <span className="lesson-row-code">{lesson.code}</span>
                    <span className="lesson-row-title">{lesson.title}</span>
                    <span className="lesson-row-focus">{lesson.focus}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p>
            <Link className="back-link" href="/">
              ← All grades
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
