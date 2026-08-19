import type { ReactNode } from "react";

interface DoProps {
  /** The game or activity name, e.g. "Beat Freeze". */
  title: string;
  children: ReactNode;
}

/** The "You do" block of a class period — the game or hands-on work. */
export function Do({ title, children }: DoProps) {
  return (
    <section className="do-block">
      <p className="eyebrow">Do · {title}</p>
      {children}
    </section>
  );
}
