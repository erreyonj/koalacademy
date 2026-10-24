import type { Metadata } from "next";
import Link from "next/link";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "2 Octave Scales",
  description: "Two octaves of a chosen scale — coming next in Keys.lite.",
};

export default function TwoOctavePage() {
  return (
    <StubPage
      eyebrow="Toolkit · Keyboard"
      title="2 Octave Scales"
      lede="The same fingering walk as one octave, stretched across two octaves."
      lcd="Keys.lite — 2 Octave · Coming next"
    >
      <div className="empty-note">
        <p>This lab is a hold for the next pass.</p>
      </div>
      <p>
        <Link className="back-link" href="/tools/keys-lite/">
          ← Keys.lite
        </Link>
      </p>
    </StubPage>
  );
}
