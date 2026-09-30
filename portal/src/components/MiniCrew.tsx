import { Slide } from "./Deck";

/** Shared K-2 check-in slide. Same prompt every class. */
export function MiniCrew() {
  return (
    <Slide
      section="Mini Crew"
      kicker="Mini Crew"
      lines={["What are you carrying?", "What are you checking?"]}
    />
  );
}
