import type { Metadata } from "next";
import Link from "next/link";
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
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
          <LedText as="h1" className="page-title" text="Keys.lite" />
          <LedText
            as="p"
            className="page-lede"
            text="Pick a keyboard lab. One-octave scales are ready; two-octave scales and warmups come next."
          />
        </div>
      </header>

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
