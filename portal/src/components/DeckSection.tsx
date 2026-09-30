import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import type { SlideProps } from "./Deck";

interface SectionProps {
  /** Class block shown in the deck counter, e.g. "Beat Freeze" or "Closing Crew". */
  name: string;
  children: ReactNode;
}

/**
 * Groups slides under one class block. Server component: it stamps the block
 * name onto each slide before Deck (a client component) receives them.
 */
export function Section({ name, children }: SectionProps) {
  return (
    <>
      {Children.toArray(children).map((child) =>
        isValidElement<SlideProps>(child) && typeof child.type !== "string"
          ? cloneElement(child, { section: name })
          : null,
      )}
    </>
  );
}
