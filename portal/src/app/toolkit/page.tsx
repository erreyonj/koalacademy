import Link from "next/link";
import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Toolkit",
};

export default function ToolkitPage() {
  return (
    <StubPage
      eyebrow="Toolkit"
      title="Skills, pads, and extras."
      lede="Out-of-lesson tools live here. The notation sandbox is ready; the rest of the kit fills in as we write it."
      lcd="Toolkit — Standby"
    >
      <article className="slide-body">
        <div className="empty-note">
          <p>
            <Link href="/tools/notation/">Notation sandbox</Link> — clef, key,
            time, notes, and rests on a 1–2 bar staff.
          </p>
          <p>
            <Link href="/resources/">Lesson resources</Link> still holds
            Investigate / Playlist / Skills slots the toolbar points at.
          </p>
        </div>
      </article>
    </StubPage>
  );
}
