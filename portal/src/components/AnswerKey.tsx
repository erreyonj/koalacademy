import type { ReactNode } from "react";

interface AnswerKeyProps {
  /** Short label, e.g. "Planted finds". */
  title?: string;
  children: ReactNode;
}

/** Teacher-only cheat sheet under Activate. Greyed so it does not read as student copy. */
export function AnswerKey({ title = "Planted finds", children }: AnswerKeyProps) {
  return (
    <section className="answer-key">
      <p className="eyebrow">Answer key · {title}</p>
      {children}
    </section>
  );
}
