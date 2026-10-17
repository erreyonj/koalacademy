import { Suspense } from "react";
import type { Metadata } from "next";
import { GlossaryHub, GlossaryHubFallback } from "@/components/GlossaryHub";
import { getLessonsForBand } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Course terms by lesson, and an A–Z list.",
};

export default function GlossaryPage() {
  const catalog = getLessonsForBand("6-8").map((lesson) => ({
    code: lesson.code,
    title: lesson.title,
    slug: lesson.slug,
  }));

  return (
    <Suspense fallback={<GlossaryHubFallback />}>
      <GlossaryHub catalog={catalog} />
    </Suspense>
  );
}
