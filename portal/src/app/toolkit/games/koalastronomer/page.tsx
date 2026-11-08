import type { Metadata } from "next";
import { KoalastronomerApp } from "@/features/koalastronomer/components/KoalastronomerApp";

export const metadata: Metadata = {
  title: "Koalastronomer",
  description:
    "Restore the observatory by reconstructing damaged musical records to earn Calibration and aligning the brass telescope across the star chart.",
};

export default function KoalastronomerPage() {
  return (
    <div className="koalastronomer-page">
      <KoalastronomerApp />
    </div>
  );
}
