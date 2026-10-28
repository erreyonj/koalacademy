import { KeysLiteCardGrid, type KeysLiteCard } from "./KeysLiteCardGrid";

const PROGRAMS: KeysLiteCard[] = [
  {
    id: "one-octave",
    code: "KL-01",
    title: "1 Octave Scales",
    description:
      "Walk one octave of a chosen key, including the thumb-under turn.",
    href: "/tools/keys-lite/one-octave/",
    status: "Live",
  },
  {
    id: "two-octave",
    code: "KL-02",
    title: "2 Octave Scales",
    description: "The same walk, stretched across two octaves.",
    href: "/tools/keys-lite/two-octave/",
    status: "Coming",
  },
  {
    id: "warmups",
    code: "KL-03",
    title: "Warmups",
    description: "Short keyboard drills before a scale or a song.",
    href: "/tools/keys-lite/warmups/",
    status: "Live",
  },
];

export function KeysLiteIndex() {
  return <KeysLiteCardGrid cards={PROGRAMS} />;
}
