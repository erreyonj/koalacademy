import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BANDS } from "@/lib/types";
import { classesByBand } from "../registry";

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
              {classes.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/classes/${entry.id}/`} className="block h-full no-underline">
                    <Card className="h-full border-[3px] border-[color:var(--ka-edge)] shadow-[0_5px_0_var(--ka-edge)]">
                      <CardHeader>
                        <CardTitle className="font-heading text-xl">
                          <span className="classes-card-label">{entry.label}</span>
                          <span className="classes-card-name">{entry.name}</span>
                        </CardTitle>
                        <CardDescription>
                          {entry.marbleCohort
                            ? `Class ${entry.unit}.`
                            : "Class points coming soon."}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
