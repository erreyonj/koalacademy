import type { Metadata } from "next";
import { BehaviorPage } from "@/features/behavior/components/BehaviorPage";

export const metadata: Metadata = {
  title: "Behavior marbles",
  description: "Class marble tracker for Scholars and K–5. Teacher code required.",
};

export default function BehaviorRoute() {
  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <p className="eyebrow">Teacher mode</p>
          <h1 className="page-title">Behavior marbles</h1>
          <p className="page-lede">
            Pick a class, then tap + or − on a student as it happens. Every
            marble lands in the class bucket.
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
