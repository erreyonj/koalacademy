import type { Metadata } from "next";
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
          <p className="eyebrow">Homerooms</p>
          <h1 className="page-title">Classes</h1>
          <p className="page-lede">
            Pick a class to put its homeroom screen up — seats, marbles, and
            the lesson to pick back up.
          </p>
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
