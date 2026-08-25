"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CIRCLE,
  RESET_MODE,
  RESET_TONIC_INDEX,
  fifthIndex,
  fourthIndex,
  getKeyInfo,
  prettyPitch,
  relativeOf,
  shortestTargetRotation,
} from "@/lib/circle-of-fifths";
import type { KeyMode } from "@/lib/circle-of-fifths";
import { CofControls } from "./CofControls";
import { CofReadout } from "./CofReadout";
import { CofWheel } from "./CofWheel";

export function CircleOfFifths() {
  const [tonicIndex, setTonicIndex] = useState(RESET_TONIC_INDEX);
  const [mode, setMode] = useState<KeyMode>(RESET_MODE);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const info = useMemo(() => getKeyInfo(tonicIndex, mode), [tonicIndex, mode]);

  function rotateTo(nextIndex: number) {
    setRotationDeg((current) => shortestTargetRotation(current, nextIndex));
    setTonicIndex(nextIndex);
  }

  function stepFourth() {
    rotateTo(fourthIndex(tonicIndex));
  }

  function stepFifth() {
    rotateTo(fifthIndex(tonicIndex));
  }

  function goRelative() {
    const next = relativeOf(tonicIndex, mode);
    rotateTo(next.tonicIndex);
    setMode(next.mode);
  }

  function reset() {
    rotateTo(RESET_TONIC_INDEX);
    setMode(RESET_MODE);
  }

  return (
    <div className="cof">
      <div className="deck-screen">
        <span className="lcd">
          {prettyPitch(info.tonic)} {mode} · {info.signatureLine}
        </span>
      </div>

      <div className="cof-stage">
        <CofReadout
          key={`${info.tonic}:${info.mode}`}
          info={info}
          reduceMotion={reduceMotion}
          onRelative={goRelative}
        />

        <div className="cof-wheel-col">
          <div className="cof-callout">
            <span className="cof-callout-pitch">{prettyPitch(info.subdominant)}</span>
            <span className="cof-callout-role">subdominant / plagal</span>
          </div>
          <CofWheel
            tonicIndex={tonicIndex}
            mode={mode}
            rotationDeg={rotationDeg}
            reduceMotion={reduceMotion}
            onFifth={stepFifth}
            onFourth={stepFourth}
          />
          <div className="cof-callout">
            <span className="cof-callout-pitch">{prettyPitch(info.dominant)}</span>
            <span className="cof-callout-role">dominant / perfect</span>
          </div>
        </div>
      </div>

      <CofControls
        tonicIndex={tonicIndex}
        mode={mode}
        fourthLabel={CIRCLE[fourthIndex(tonicIndex)]}
        fifthLabel={CIRCLE[fifthIndex(tonicIndex)]}
        onFourth={stepFourth}
        onFifth={stepFifth}
        onRelative={goRelative}
        onReset={reset}
        onJump={rotateTo}
      />
    </div>
  );
}
