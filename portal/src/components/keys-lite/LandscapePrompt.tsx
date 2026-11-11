import { Smartphone } from "lucide-react";

/** Shown when Both hands is on but the device is in portrait. */
export function LandscapePrompt() {
  return (
    <div className="scale-hand-landscape-card" role="status">
      <span className="scale-hand-landscape-icon" aria-hidden="true">
        <Smartphone />
      </span>
      <p className="scale-hand-landscape-title">Turn to landscape</p>
      <p className="scale-hand-landscape-copy">
        Both hands needs a wide keyboard. Rotate your device to play.
      </p>
    </div>
  );
}
