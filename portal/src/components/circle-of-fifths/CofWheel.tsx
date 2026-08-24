"use client";

import { Cog } from "lucide-react";
import { CIRCLE, fifthIndex, fourthIndex, prettyPitch } from "@/lib/circle-of-fifths";
import type { KeyMode } from "@/lib/circle-of-fifths";

interface CofWheelProps {
  tonicIndex: number;
  mode: KeyMode;
  rotationDeg: number;
  reduceMotion: boolean;
  onFifth: () => void;
  onFourth: () => void;
}

export function CofWheel({
  tonicIndex,
  mode,
  rotationDeg,
  reduceMotion,
  onFifth,
  onFourth,
}: CofWheelProps) {
  const selected = CIRCLE[tonicIndex];
  const fifth = CIRCLE[fifthIndex(tonicIndex)];

  return (
    <div
      className="cof-wheel"
      role="group"
      aria-label={`Circle of fifths. ${prettyPitch(selected)} ${mode} is selected.`}
    >
      <div
        className={`cof-ring${reduceMotion ? " is-instant" : ""}`}
        style={{ transform: `rotate(${rotationDeg}deg)` }}
      >
        {CIRCLE.map((tonic, index) => {
          const isFourth = index === fourthIndex(tonicIndex);
          const isFifth = index === fifthIndex(tonicIndex);
          const isSelected = index === tonicIndex;
          const slotAngle = index * 30;
          const upright = -(slotAngle + rotationDeg);

          if (isFourth || isFifth) {
            return (
              <button
                key={tonic}
                type="button"
                className={`cof-slot${isFourth ? " is-fourth" : " is-fifth"}`}
                style={{
                  transform: `rotate(${slotAngle}deg) translateX(var(--cof-radius))`,
                }}
                aria-label={
                  isFourth
                    ? `Step to the fourth, ${prettyPitch(tonic)}`
                    : `Step to the fifth, ${prettyPitch(tonic)}`
                }
                onClick={isFourth ? onFourth : onFifth}
              >
                <span style={{ transform: `rotate(${upright}deg)` }}>
                  {prettyPitch(tonic)}
                </span>
              </button>
            );
          }

          return (
            <span
              key={tonic}
              className={`cof-slot${isSelected ? " is-selected" : ""}`}
              style={{
                transform: `rotate(${slotAngle}deg) translateX(var(--cof-radius))`,
              }}
              aria-hidden={isSelected ? true : undefined}
            >
              <span style={{ transform: `rotate(${upright}deg)` }}>
                {prettyPitch(tonic)}
              </span>
            </span>
          );
        })}
      </div>

      <div className="cof-hub" aria-hidden="true" />

      <div className="cof-tab">
        <span className="cof-tab-letter">{prettyPitch(selected)}</span>
        <button
          type="button"
          className="cof-gear"
          aria-label={`Step to the fifth, ${prettyPitch(fifth)}`}
          onClick={onFifth}
        >
          <Cog aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
