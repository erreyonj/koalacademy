import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeroomView } from "@/features/classes/components/HomeroomView";
import { CLASS_IDS, getClass } from "@/features/classes/registry";
import { getLessonsForBand } from "@/lib/lessons";

interface PageProps {
  params: Promise<{ cohort: string }>;
}

export function generateStaticParams() {
  return CLASS_IDS.map((cohort) => ({ cohort }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cohort } = await params;
  const entry = getClass(cohort);
  return { title: entry ? `${entry.name} homeroom` : "Classes" };
}

export default async function HomeroomPage({ params }: PageProps) {
  const { cohort } = await params;
  const entry = getClass(cohort);
  if (!entry) notFound();

  // Static export: the lesson order is read from disk at build time and
  // handed to the client, which overlays live teacher progress on it.
  const sequence = getLessonsForBand(entry.band).map((lesson) => ({
    slug: lesson.slug,
    code: lesson.code,
    title: lesson.title,
  }));

  return (
    <HomeroomView entry={entry} sequence={sequence} />
  );
}
