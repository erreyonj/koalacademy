import Link from "next/link";
import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Classroom games played on the iPads — join with a game code from the board.",
};

export default function GamesPage() {
  return (
    <StubPage
      eyebrow="Toolkit · Games"
      title="Class games, on the iPads."
      lede="Jackbox-style games for the room: the teacher hosts from one device, everyone else joins with the code on the board. More games land here as they're built."
      lcd="Games — Ready"
    >
      <article className="slide-body">
        <div className="empty-note">
          <p>
            <Link href="/toolkit/games/salad-bowl/">Salad Bowl</Link> — the
            bowl game in three rounds: Describe, Charades, then One Word.
            Free-for-all cards from the class, or a Koala/Music deck from the
            teacher.
          </p>
          <p>
            <Link href="/toolkit/">← Toolkit</Link>
          </p>
        </div>
      </article>
    </StubPage>
  );
}
