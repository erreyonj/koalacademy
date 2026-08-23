import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Manage Profile",
};

export default function ProfilePage() {
  return (
    <StubPage
      eyebrow="Account"
      title="Manage Profile"
      lede="Name, grade, and the koala you show the room. Auth is not wired yet — this is a placeholder for Pilot Guest."
      lcd="Profile — Standby"
    />
  );
}
