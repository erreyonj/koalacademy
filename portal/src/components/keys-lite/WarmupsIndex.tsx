import { KeysLiteCardGrid, type KeysLiteCard } from "./KeysLiteCardGrid";

const WARMUPS: KeysLiteCard[] = [
  {
    id: "five-finger",
    code: "WU-01",
    title: "Five Finger Positions",
    description: "Thumb through pinky on degrees 1–5 of the key.",
    href: "/tools/keys-lite/warmups/five-finger/",
    status: "Live",
  },
];

export function WarmupsIndex() {
  return <KeysLiteCardGrid cards={WARMUPS} />;
}
