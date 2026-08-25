import { Suspense } from "react";
import type { Metadata } from "next";
import { SkillsHub, SkillsHubFallback } from "@/components/SkillsHub";
import { getAllLessons } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Skills",
  description: "Search curriculum topics and open the lessons that teach them.",
};

export default function SkillsPage() {
  const lessons = getAllLessons();

  return (
    <Suspense fallback={<SkillsHubFallback />}>
      <SkillsHub lessons={lessons} />
    </Suspense>
  );
}
