import type { ReactNode } from "react";

interface ActivateProps {
  /** The game or activity name, e.g. "Beat Freeze". */
  title: string;
  children: ReactNode;
}

/** The "You do" block of a class period — the game or hands-on work. */
export function Activate({ title, children }: ActivateProps) {
  return (
    <section className="activate-block">
      <p className="eyebrow">Activate · {title}</p>
      {children}
    </section>
  );
}
