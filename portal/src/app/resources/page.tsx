import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Lesson resources",
  description:
    "Out-of-lesson material the Lesson Toolbar will link to: extra videos, playlists, and skills practice.",
};

export default function ResourcesPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />

      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">Lesson Toolbar</p>
          <h1 className="page-title">Lesson resources</h1>
          <p className="page-lede">
            A holding page. Each toolbar item will eventually link to the right
            out-of-lesson material — extra videos, playlists of the songs from
            class, skills practice. Nothing lives here yet.
          </p>
        </div>
      </header>

      <main id="main" className="section">
        <div className="wrap">
          <div className="deck-screen">
            <span className="lcd">Resources — Standby</span>
          </div>

          <article className="slide-body">
            <section id="investigate" className="resource-slot">
              <h2>.Investigate</h2>
              <p>
                Extra YouTube explainers, deep dives, and related watching that
                sits beside the lesson without belonging in the slide itself.
              </p>
              <div className="empty-note">
                <p>No investigation links for this lesson yet.</p>
              </div>
            </section>

            <section id="playlist" className="resource-slot">
              <h2>.Playlist</h2>
              <p>
                Spotify and YouTube playlists of the songs from the lesson —
                listening copies a student can open after class.
              </p>
              <div className="empty-note">
                <p>No playlists for this lesson yet.</p>
              </div>
            </section>

            <section id="skills" className="resource-slot">
              <h2>.Skills</h2>
              <p>
                Drills and practice paths that sit outside the period: extra
                reps, technique, and follow-up work the lesson does not have
                time for.
              </p>
              <div className="empty-note">
                <p>
                  <Link href="/tools/notation/">Notation sandbox</Link> — clef,
                  key, time, notes, and rests on a 1–2 bar staff. Download SVG
                  or PNG for slides and worksheets.
                </p>
              </div>
            </section>
          </article>

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
