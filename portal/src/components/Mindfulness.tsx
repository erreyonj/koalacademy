import { Slide } from "./Deck";
import { YouTubeEmbed } from "./YouTubeEmbed";

/** Shared K-2 opening slide. Same video and expectations every class. */
export function Mindfulness() {
  return (
    <Slide
      section="Mindfulness"
      kicker="Mindfulness"
      sub={["Level 0.", "No questions during mindfulness."]}
    >
      <YouTubeEmbed id="oRDRfikj2z8" title="Mindfulness" />
    </Slide>
  );
}
