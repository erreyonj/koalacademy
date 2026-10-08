"use client";

import type { ClassEntry } from "../registry";
import type { SeatingChart as SeatingChartData } from "../seating";
import { ClassMarbles } from "./ClassMarbles";
import { HomeroomMenu } from "./HomeroomMenu";
import { LastLessonLink, type SequenceEntry } from "./LastLessonLink";
import { NowPlaying } from "./NowPlaying";
import { QuickInfoTicker } from "./QuickInfoTicker";
import { SeatingChart } from "./SeatingChart";

interface HomeroomViewProps {
  entry: ClassEntry;
  seating: SeatingChartData | null;
  sequence: SequenceEntry[];
}

/**
 * The screen that is up when a class walks in. Laid out like the sketch:
 * menu top-left, the player "screen" and ticker up top, tables in the middle,
 * marbles bottom-left and "Today's →" bottom-right.
 */
export function HomeroomView({ entry, seating, sequence }: HomeroomViewProps) {
  return (
    <div className="homeroom">
      <div className="homeroom-top">
        <HomeroomMenu className={entry.name} />
        <div className="homeroom-top-center">
          <NowPlaying />
          <QuickInfoTicker />
        </div>
        <div className="homeroom-top-right">
          <span className="homeroom-class-pad" aria-label={entry.name}>
            {entry.label}
          </span>
        </div>
      </div>

      <div className="homeroom-floor">
        <SeatingChart chart={seating} className={entry.name} />
        {seating?.unseated?.length ? (
          <p className="homeroom-unseated">
            <span className="homeroom-unseated-label">Choose a seat:</span>{" "}
            {seating.unseated.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="homeroom-bottom">
        <ClassMarbles cohort={entry.marbleCohort} unit={entry.unit} />
        <LastLessonLink band={entry.band} section={entry.section} sequence={sequence} />
      </div>
    </div>
  );
}
