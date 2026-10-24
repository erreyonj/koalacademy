import type { Metadata } from "next";
import { LedText } from "@/components/LedText";
import { ClassesIndex } from "@/features/classes/components/ClassesIndex";

export const metadata: Metadata = {
  title: "Classes",
  description: "Homeroom launch pages — seating, marbles, and today's lesson for every class.",
};

export default function ClassesPage() {
  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text="Homerooms" />
          <LedText as="h1" className="page-title" text="Classes" />
          <LedText
            as="p"
            className="page-lede"
            text="Pick a class to put its homeroom screen up — seats, marbles, and the lesson to pick back up."
          />
        </div>
      </header>

      <div className="section section-dashboard">
        <div className="wrap wrap-wide">
          <ClassesIndex />
        </div>
      </div>
    </>
  );
}
