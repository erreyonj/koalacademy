"use client";

import { prettyPitch } from "@/lib/circle-of-fifths";
import type { KeyInfo } from "@/lib/circle-of-fifths";

interface CofReadoutProps {
  info: KeyInfo;
  reduceMotion: boolean;
  onRelative: () => void;
}

export function CofReadout({ info, reduceMotion, onRelative }: CofReadoutProps) {
  return (
    <div className={`cof-readout${reduceMotion ? " is-instant" : ""}`}>
      <div className="cof-readout-body">
        <p className="eyebrow">Selected key</p>
        <h2 className="cof-title">{info.title}</h2>
        <p className="cof-signature">{info.signatureLine}</p>

        <p className="cof-triads" aria-label="Diatonic triads">
          {info.triads.map((triad, index) => {
            const isRelative = triad === info.relativeTriad;
            return (
              <span key={`${triad}-${index}`}>
                {index > 0 ? (
                  <span className="cof-triad-dot" aria-hidden="true">
                    {" "}
                    ·{" "}
                  </span>
                ) : null}
                {isRelative ? (
                  <button type="button" className="cof-triad is-relative" onClick={onRelative}>
                    {prettyPitch(triad)}
                  </button>
                ) : (
                  <span className="cof-triad">{prettyPitch(triad)}</span>
                )}
              </span>
            );
          })}
        </p>

        <button type="button" className="cof-relative" onClick={onRelative}>
          {info.relativeLabel}
        </button>

        <p className="cof-scale">
          <span className="cof-scale-label">Scale</span>
          {info.scale.map(prettyPitch).join("  ")}
        </p>

        <p className="cof-blurb">{info.blurb}</p>
      </div>
    </div>
  );
}
