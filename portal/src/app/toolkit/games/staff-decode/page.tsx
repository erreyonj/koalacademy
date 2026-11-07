import type { Metadata } from "next";
import { StaffDecodeApp } from "@/features/staff-decode/components/StaffDecodeApp";

export const metadata: Metadata = {
  title: "Staff DeCode",
  description:
    "Crack a run of vault safes by matching each code letter to its treble staff pitch, octave register, and note subdivision.",
};

export default function StaffDecodePage() {
  return (
    <div className="sd-page">
      <StaffDecodeApp />
    </div>
  );
}
