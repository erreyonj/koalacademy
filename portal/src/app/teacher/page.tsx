import type { Metadata } from "next";
import { LedText } from "@/components/LedText";
import { getLessonsForBand } from "@/lib/lessons";
import { BANDS, BAND_IDS } from "@/lib/types";
import { TeacherProgressPage } from "@/features/teacher-progress/TeacherProgressPage";

export const metadata: Metadata = {
  title: "Teacher mode",
};

export default function TeacherPage() {
  const bands = BAND_IDS.map((id) => {
    const band = BANDS.find((item) => item.id === id);
    return {
      band: id,
      label: band?.short ?? id,
      lessons: getLessonsForBand(id).map((lesson) => ({
        slug: lesson.slug,
        code: lesson.code,
        title: lesson.title,
      })),
    };
  });

  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text="Teacher mode" />
          <LedText as="h1" className="page-title" text="K–8 progress" />
          <LedText
            as="p"
            className="page-lede"
            text="Check L, R, and Λ when a section finishes that meeting. The first open cell in a column is the lesson to pick up."
          />
        </div>
      </header>

      <div className="section">
        <div className="wrap wrap-wide">
          <TeacherProgressPage bands={bands} />
        </div>
      </div>
    </>
  );
}
