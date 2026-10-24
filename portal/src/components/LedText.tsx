import type { CSSProperties, ElementType } from "react";

const ALNUM = /^[\p{L}\p{N}]$/u;

function markWidth(ch: string): string | null {
  if (ALNUM.test(ch)) return null;
  if (ch === "—" || ch === "–" || ch === "-") return "0.42em";
  if (ch === "·" || ch === "•") return "0.32em";
  return "0.22em";
}

export function LedText({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  return (
    <Tag className={className ? `led ${className}` : "led"} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span key={`${wordIndex}-${word}`} className="led-word" aria-hidden="true">
          {Array.from(word).map((ch, charIndex) => {
            const width = markWidth(ch);
            const style: CSSProperties | undefined = width ? { width } : undefined;
            return (
              <span
                key={charIndex}
                className={width ? "led-cell is-mark" : "led-cell"}
                style={style}
              >
                <span className="led-ghost">{width ? ch : "8"}</span>
                <span className="led-lit">{ch}</span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
