import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BANDS } from "@/lib/types";
import { classesByBand } from "../registry";
import { getSeating } from "../seating";

/** One card per class, grouped by grade band, each opening its homeroom page. */
export function ClassesIndex() {
  return (
    <div className="classes-index">
      {classesByBand().map(({ band, classes }) => {
        const info = BANDS.find((item) => item.id === band);
        return (
          <section key={band} className="classes-band" aria-labelledby={`classes-${band}`}>
            <h2 id={`classes-${band}`} className="eyebrow">
              {info?.label ?? band}
            </h2>
            <ul className="classes-grid" role="list">
              {classes.map((entry) => {
                const seated = Boolean(getSeating(entry.id));
                return (
                  <li key={entry.id}>
                    <Link href={`/classes/${entry.id}/`} className="block h-full no-underline">
                      <Card className="h-full border-[3px] border-foreground shadow-[0_5px_0_var(--ka-ink)]">
                        <CardHeader>
                          <CardTitle className="font-heading text-xl">
                            <span className="classes-card-label">{entry.label}</span>
                            <span className="classes-card-name">{entry.name}</span>
                          </CardTitle>
                          <CardDescription>
                            {seated ? "Seating chart ready." : "No seating chart yet."}{" "}
                            {entry.marbleCohort
                              ? `Class ${entry.unit}.`
                              : "Class points coming soon."}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
