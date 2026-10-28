import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { KeysLiteIndex } from "@/components/keys-lite/KeysLiteIndex";

export const metadata: Metadata = {
  title: "Keys.lite",
  description:
    "Keyboard lab programs — one-octave scales, two-octave scales, and warmups.",
};

export default function KeysLitePage() {
  return (
    <>
      <GlassScreen>
          <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
          <LedText as="h1" className="page-title" text="Keys.lite" />
          <LedText
            as="p"
            className="page-lede"
            text="Pick a keyboard lab. One-octave scales and warmups are ready; two-octave scales come next."
          />
      </GlassScreen>

      <div className="section">
        <div className="wrap wrap-wide">
          <KeysLiteIndex />
          <p>
            <Link className="back-link" href="/toolkit/">
              ← Toolkit
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
