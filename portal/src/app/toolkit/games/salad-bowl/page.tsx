import type { Metadata } from "next";
import { Suspense } from "react";
import { SaladBowlApp } from "@/features/salad-bowl/components/SaladBowlApp";

export const metadata: Metadata = {
  title: "Salad Bowl",
  description:
    "Three rounds — Describe, Charades, One Word — from one shared bowl. Host a game or join with the class code.",
};

// The join screen reads ?code= from the URL, which requires a Suspense
// boundary under static export.
export default function SaladBowlPage() {
  return (
    <div className="sb-page">
      <Suspense fallback={<div className="sb-shell" aria-busy="true" />}>
        <SaladBowlApp />
      </Suspense>
    </div>
  );
}
