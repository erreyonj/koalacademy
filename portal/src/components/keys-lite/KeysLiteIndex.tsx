import Link from "next/link";

const PROGRAMS = [
  {
    id: "one-octave",
    code: "KL-01",
    title: "1 Octave Scales",
    description:
      "Walk one octave of a chosen key, including the thumb-under turn.",
    href: "/tools/keys-lite/one-octave/",
    status: "Live" as const,
  },
  {
    id: "two-octave",
    code: "KL-02",
    title: "2 Octave Scales",
    description: "The same walk, stretched across two octaves.",
    href: "/tools/keys-lite/two-octave/",
    status: "Coming" as const,
  },
  {
    id: "warmups",
    code: "KL-03",
    title: "Warmups",
    description: "Short keyboard drills before a scale or a song.",
    href: "/tools/keys-lite/warmups/",
    status: "Coming" as const,
  },
] as const;

export function KeysLiteIndex() {
  return (
    <ul className="keys-lite-grid" role="list">
      {PROGRAMS.map((program) => (
        <li key={program.id}>
          <Link href={program.href} className="keys-lite-card btn-backlit">
            <span className="keys-lite-card-code">{program.code}</span>
            <span className="keys-lite-status">{program.status}</span>
            <span className="keys-lite-card-title">{program.title}</span>
            <span className="keys-lite-card-focus">{program.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
