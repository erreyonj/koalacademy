import type { Metadata } from "next";
import Link from "next/link";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Warmups",
  description: "Short keyboard drills before a scale or a song — coming next in Keys.lite.",
};

export default function WarmupsPage() {
  return (
    <StubPage
      eyebrow="Toolkit · Keyboard"
      title="Warmups"
      lede="Short keyboard drills to get fingers ready before a scale or a song."
      lcd="Keys.lite — Warmups · Coming next"
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
