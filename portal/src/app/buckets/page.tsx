import type { Metadata } from "next";
import { LedText } from "@/components/LedText";
import { BehaviorPage } from "@/features/behavior/components/BehaviorPage";

export const metadata: Metadata = {
  title: "Class Buckets",
  description: "Class marble buckets for Scholars and K–8. Teacher code required.",
};

export default function BucketsRoute() {
  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="h1" className="page-title" text="Class Buckets" />
          <LedText
            as="p"
            className="page-lede"
            text="Let's be Bucket Fillers and not Bucket Dippers."
          />
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
