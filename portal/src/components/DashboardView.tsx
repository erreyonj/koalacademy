import Link from "next/link";
import { Newspaper } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LedText } from "@/components/LedText";
import { BucketsLauncher } from "@/features/behavior/components/BucketsLauncher";

const SHORTCUTS = [
  {
    href: "/classes/",
    title: "Classes",
    description: "Homeroom screens — seats, marbles, lessons, and more.",
  },
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
          <LedText as="p" className="eyebrow" text="K–8 Music Pilot" />
          <LedText as="h1" className="page-title" text="Today's lesson, in two taps." />
          <LedText
            as="p"
            className="page-lede"
            text="Every lesson as a page you can read on a phone or throw on a projector — the concept, the listening, and the game."
          />
        </div>
      </header>

      <div className="section section-dashboard">
        <div className="wrap">
          <h2 className="eyebrow">Jump in</h2>
          <ul className="dashboard-grid" role="list">
            {SHORTCUTS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block no-underline">
                  <Card className="h-full btn-backlit">
                    <CardHeader>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
            <li>
              <BucketsLauncher />
            </li>
          </ul>
        </div>
      </div>

      <Link href="/newsletter/" className="newsletter-fab" aria-label="Class updates">
        <Newspaper aria-hidden="true" />
      </Link>
    </>
  );
}
