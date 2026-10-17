import { Suspense } from "react";
import type { Metadata } from "next";
import { GlossaryHub, GlossaryHubFallback } from "@/components/GlossaryHub";
import { glossaryLessonTitle, glossaryLessons } from "@/lib/glossary";
import { getAllLessons } from "@/lib/lessons";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Course terms by lesson, and an A–Z list.",
};

export default function GlossaryPage() {
  const lessons = getAllLessons();
  const titles = Object.fromEntries(
    glossaryLessons().map((lesson) => [
      lesson.code,
      glossaryLessonTitle(lesson.code, lessons),
    ])
  );

  return (
    <Suspense fallback={<GlossaryHubFallback />}>
      <GlossaryHub titles={titles} />
    </Suspense>
  );
}
