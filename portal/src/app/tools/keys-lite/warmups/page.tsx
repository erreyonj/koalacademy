import type { Metadata } from "next";
import Link from "next/link";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";
import { WarmupsIndex } from "@/components/keys-lite/WarmupsIndex";

export const metadata: Metadata = {
  title: "Warmups",
  description:
    "Short keyboard drills to get fingers ready before a scale or a song.",
};

export default function WarmupsPage() {
  return (
    <>
      <GlassScreen>
        <LedText as="p" className="eyebrow" text="Toolkit · Keyboard" />
        <LedText as="h1" className="page-title" text="Warmups" />
        <LedText
          as="p"
          className="page-lede"
          text="Short keyboard drills to get fingers ready before a scale or a song."
        />
      </GlassScreen>

      <div className="section">
        <div className="wrap wrap-wide">
          <WarmupsIndex />
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
