import Link from "next/link";
import type { Metadata } from "next";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";

export const metadata: Metadata = {
  title: "Lesson resources",
  description:
    "Out-of-lesson material the Lesson Toolbar will link to: extra videos, playlists, and skills practice.",
};

export default function ResourcesPage() {
  return (
    <>
      <GlassScreen>
          <LedText as="p" className="eyebrow" text="Lesson Toolbar" />
          <LedText as="h1" className="page-title" text="Lesson resources" />
          <LedText
            as="p"
            className="page-lede"
            text="A holding page. Each toolbar item will eventually link to the right out-of-lesson material — extra videos, playlists of the songs from class, skills practice. Nothing lives here yet."
          />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <div className="stub-plate">
            <p className="stub-readout">Resources — Standby</p>
          </div>

          <article className="slide-body">
            <section id="investigate" className="resource-slot">
              <h2>.Investigate</h2>
              <p>
                Extra YouTube explainers, deep dives, and related watching that
                sits beside the lesson without belonging in the slide itself.
              </p>
              <div className="stub-plate">
                <p>No investigation links for this lesson yet.</p>
              </div>
            </section>

            <section id="playlist" className="resource-slot">
              <h2>.Playlist</h2>
              <p>
                Spotify and YouTube playlists of the songs from the lesson —
                listening copies a student can open after class.
              </p>
              <div className="stub-plate">
                <p>No playlists for this lesson yet.</p>
              </div>
            </section>

            <section id="skills" className="resource-slot">
              <h2>.Skills</h2>
              <p>
                Topic search across the course. Open a lesson from Options to
                see the tags for that slide, or browse the full hub.
              </p>
              <div className="stub-plate">
                <p>
                  <Link href="/skills/">Skills hub</Link> — search tags and
                  lesson titles.
                </p>
              </div>
            </section>
          </article>

          <p>
            <Link className="back-link" href="/toolkit/">
              ← Toolkit
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
