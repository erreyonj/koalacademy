import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LedText } from "@/components/LedText";
import {
  BandLessonList,
  BandLessonListFallback,
} from "@/components/BandLessonList";
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
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText
            as="p"
            className="eyebrow"
            text={band.track === "unplugged" ? "Unplugged" : "Koalacademy production"}
          />
          <LedText as="h1" className="page-title" text={band.label} />
          <LedText as="p" className="page-lede" text={band.blurb} />
        </div>
      </header>

      <div className="section section-lesson">
        <div className="wrap">
          {lessons.length === 0 ? (
            <div className="empty-note">
              <p>
                No slides written for this band yet. Lessons appear here as they are added
                to <code>content/lessons/</code>.
              </p>
            </div>
          ) : (
            <Suspense fallback={<BandLessonListFallback lessons={lessons} />}>
              <BandLessonList bandId={band.id} lessons={lessons} />
            </Suspense>
          )}

          <p>
            <Link className="back-link" href="/lessons/">
              ← All grades
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
