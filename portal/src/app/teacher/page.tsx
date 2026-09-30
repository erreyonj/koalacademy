import type { Metadata } from "next";
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
          <p className="eyebrow">Teacher mode</p>
          <h1 className="page-title">K–8 progress</h1>
          <p className="page-lede">
            Check L, R, and Λ when a section finishes that meeting. The first
            open cell in a column is the lesson to pick up.
          </p>
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
