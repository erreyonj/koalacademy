import type { Metadata } from "next";
import { BehaviorPage } from "@/features/behavior/components/BehaviorPage";

export const metadata: Metadata = {
  title: "Class Buckets",
  description: "Class marble buckets for Scholars and K–5. Teacher code required.",
};

export default function BucketsRoute() {
  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title">Class Buckets</h1>
          <p className="page-lede">
            Let&apos;s be Bucket Fillers and not Bucket Dippers.
          </p>
        </div>
      </header>

      <div className="section">
        <div className="wrap wrap-wide">
          <BehaviorPage />
        </div>
      </div>
    </>
  );
}
