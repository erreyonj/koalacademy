import {
  FINGERS,
  type Finger,
  type HandSide,
} from "./timeline";

const FRAME_DIR = "/keys-lite";
const FRAME_IDLE = "keys-lite-rh-frame-1.png";

const FINGER_FRAMES: Record<Finger, string> = {
  1: FRAME_IDLE,
  2: "keys-lite-rh-frame-2+5.png",
  3: "keys-lite-rh-frame-3+6.png",
  4: "keys-lite-rh-frame-7.png",
  5: "keys-lite-rh-frame-8.png",
};
const FRAME_THUMB_AFTER = "keys-lite-rh-frame-4.png";

export const GUTTER_FRAME_FILES = [
  FRAME_IDLE,
  "keys-lite-rh-frame-2+5.png",
  "keys-lite-rh-frame-3+6.png",
  "keys-lite-rh-frame-4.png",
  "keys-lite-rh-frame-7.png",
  "keys-lite-rh-frame-8.png",
] as const;

export function gutterFrameSrc(
  finger: Finger | null,
  afterTurn = false,
): string {
  if (!finger) return `${FRAME_DIR}/${FRAME_IDLE}`;
  const file =
    finger === 1 && afterTurn ? FRAME_THUMB_AFTER : FINGER_FRAMES[finger];
  return `${FRAME_DIR}/${file}`;
}

/** Fingertip badge centers as % of the gutter PNG. Right: thumb on image-left. */
const TIPS_RIGHT: Record<Finger, { x: number; y: number }> = {
  1: { x: 21.2, y: 41.5 },
  2: { x: 37.5, y: 15.4 },
  3: { x: 50.7, y: 10.9 },
  4: { x: 63.5, y: 15.6 },
  5: { x: 79.4, y: 29.8 },
};

/** Left gutter uses a mirrored image, so thumb sits on image-right. */
const TIPS_LEFT: Record<Finger, { x: number; y: number }> = {
  1: { x: 78.8, y: 41.5 },
  2: { x: 62.5, y: 15.4 },
  3: { x: 49.3, y: 10.9 },
  4: { x: 36.5, y: 15.6 },
  5: { x: 20.6, y: 29.8 },
};

export function GutterHand({
  side,
  pressedFinger,
  afterTurn = false,
}: {
  side: HandSide;
  pressedFinger: Finger | null;
  afterTurn?: boolean;
}) {
  const tips = side === "right" ? TIPS_RIGHT : TIPS_LEFT;
  return (
    <div className="scale-hand-gutter" data-side={side}>
      <div className="scale-hand-gutter-inner">
        <img
          src={gutterFrameSrc(pressedFinger, afterTurn)}
          alt=""
          className="scale-hand-gutter-img"
        />
        {FINGERS.map((finger) => (
          <span
            key={finger}
            className={
              pressedFinger === finger
                ? "scale-hand-tip is-active"
                : "scale-hand-tip"
            }
            style={{ left: `${tips[finger].x}%`, top: `${tips[finger].y}%` }}
          >
            {finger}
          </span>
        ))}
      </div>
    </div>
  );
}
