import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { SongsIndex } from "@/components/keys-lite/SongsIndex";

export const metadata: Metadata = {
  title: "Songs",
  description:
    "Short song loops for Keys.lite: left hand holds the bass, right hand holds the chords.",
};

export default function SongsPage() {
  return (
    <>
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
        <LedText as="h1" className="page-title" text="Songs" />
        <LedText
          as="p"
          className="page-lede"
          text="Left hand holds the bass root. Right hand holds the triad. Follow the staff, then match both hands on the piano."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap wrap-wide">
          <SongsIndex />
          <p>
            <Link className="back-link" href="/tools/keys-lite/">
              ← Keys.lite
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
