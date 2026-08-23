import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Submissions",
};

export default function SubmissionsPage() {
  return (
    <StubPage
      eyebrow="Work"
      title="Submissions"
      lede="Turn-in for written work and projects. No accounts yet, so this pad is dark."
      lcd="Submissions — Standby"
    />
  );
}
