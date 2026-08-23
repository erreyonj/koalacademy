import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function SettingsPage() {
  return (
    <StubPage
      eyebrow="Account"
      title="Account Settings"
      lede="Password, notifications, and classroom preferences. Nothing to toggle until accounts land."
      lcd="Settings — Standby"
    />
  );
}
