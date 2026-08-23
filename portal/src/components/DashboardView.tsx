import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SHORTCUTS = [
  {
    href: "/lessons/",
    title: "Lessons",
    description: "Pick a grade band and open today's slide.",
  },
  {
    href: "/toolkit/",
    title: "Toolkit",
    description: "Notation sandbox and out-of-lesson skills.",
  },
  {
    href: "/playlists/",
    title: "Playlists",
    description: "Listening copies from class, when they land.",
  },
  {
    href: "/submissions/",
    title: "Submissions",
    description: "Turn-in later. Holding page for now.",
  },
] as const;

export function DashboardView() {
  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">K–8 Music Pilot</p>
          <h1 className="page-title">Today&apos;s lesson, in two taps.</h1>
          <p className="page-lede">
            Every lesson as a page you can read on a phone or throw on a
            projector — the concept, the listening, and the game.
          </p>
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          <h2 className="eyebrow">Jump in</h2>
          <ul className="dashboard-grid" role="list">
            {SHORTCUTS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block no-underline">
                  <Card className="h-full border-[3px] border-foreground shadow-[0_5px_0_var(--ka-ink)]">
                    <CardHeader>
                      <CardTitle className="font-heading text-xl">
                        {item.title}
                      </CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
