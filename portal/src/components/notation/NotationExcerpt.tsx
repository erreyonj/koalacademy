"use client";

import { useMemo, useRef } from "react";
import { excerptFromProps } from "@/lib/notation/parse";
import type { Clef, ScoreExcerpt, TimeSignature } from "@/lib/notation/types";
import { downloadPng, downloadSvg } from "./download";
import { NotationStaff } from "./NotationStaff";

export interface NotationExcerptProps {
  clef?: Clef;
  /** Tonal key name: "C", "G", "Am". Use this in MDX — do not pass `key`. */
  keySig?: string;
  time?: TimeSignature;
  /** Compact tokens, e.g. "C4/q D4/q E4/q F4/q" or "r/q r/q r/q r/q". */
  notes?: string;
  score?: ScoreExcerpt;
  caption?: string;
  download?: boolean;
}

export function NotationExcerpt({
  clef,
  keySig,
  time,
  notes,
  score,
  caption,
  download = false,
}: NotationExcerptProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const excerpt = useMemo(
    () => score ?? excerptFromProps({ clef, key: keySig, time, notes }),
    [score, clef, keySig, time, notes],
  );
  const fileName = caption ?? "notation-excerpt";

  return (
    <figure className="notation-excerpt" ref={hostRef}>
      <NotationStaff score={excerpt} label={caption ?? "Notation excerpt"} />
      {caption ? <figcaption>{caption}</figcaption> : null}
      {download ? (
        <div className="notation-download">
          <button
            type="button"
            className="notation-btn"
            onClick={() => {
              const staff = hostRef.current?.querySelector<HTMLElement>(".notation-staff");
              if (staff) downloadSvg(staff, fileName);
            }}
          >
            Download SVG
          </button>
          <button
            type="button"
            className="notation-btn"
            onClick={() => {
              const staff = hostRef.current?.querySelector<HTMLElement>(".notation-staff");
              if (staff) void downloadPng(staff, fileName);
            }}
          >
            Download PNG
          </button>
        </div>
      ) : null}
    </figure>
  );
}
