import type { Metadata } from "next";
import { StubPage } from "@/components/StubPage";

export const metadata: Metadata = {
  title: "Playlists",
};

export default function PlaylistsPage() {
  return (
    <StubPage
      eyebrow="Listening"
      title="Playlists"
      lede="Spotify and YouTube copies of the songs from class — listening a student can open after the period."
      lcd="Playlists — Standby"
    />
  );
}
