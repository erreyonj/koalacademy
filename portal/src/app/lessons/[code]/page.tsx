import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Break } from "@/components/Break";
import { Do } from "@/components/Do";
import { NotationExcerpt } from "@/components/notation/NotationExcerpt";
import { SlideShell } from "@/components/SlideShell";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { getAllLessons, getLessonWithNeighbours } from "@/lib/lessons";

const mdxComponents = { Break, Do, NotationExcerpt, YouTubeEmbed };

interface PageProps {
  params: Promise<{ code: string }>;
}

export function generateStaticParams() {
  return getAllLessons().map((lesson) => ({ code: lesson.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const entry = getLessonWithNeighbours(code);
  if (!entry) return {};
  return { title: entry.lesson.title, description: entry.lesson.focus };
}

export default async function LessonPage({ params }: PageProps) {
  const { code } = await params;
  const entry = getLessonWithNeighbours(code);
  if (!entry) notFound();

  // Static prefix keeps the bundler able to resolve every lesson at build time.
  const { default: Body } = await import(`../../../../content/lessons/${code}.mdx`);

  return (
    <SlideShell {...entry}>
      <Body components={mdxComponents} />
    </SlideShell>
  );
}
