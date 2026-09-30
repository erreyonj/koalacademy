import type { MDXComponents } from "mdx/types";
import { Activate } from "@/components/Activate";
import { AnswerKey } from "@/components/AnswerKey";
import { Break } from "@/components/Break";
import { Deck, Slide } from "@/components/Deck";
import { Section } from "@/components/DeckSection";
import { DoNow } from "@/components/DoNow";
import { MiniCrew } from "@/components/MiniCrew";
import { Mindfulness } from "@/components/Mindfulness";
import { Notes } from "@/components/Notes";
import { NotationExcerpt } from "@/components/notation/NotationExcerpt";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

/**
 * Components available to every .mdx lesson without an import, so authoring a
 * slide stays close to writing Markdown.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Activate,
    AnswerKey,
    Break,
    Deck,
    DoNow,
    MiniCrew,
    Mindfulness,
    Notes,
    NotationExcerpt,
    Section,
    Slide,
    YouTubeEmbed,
  };
}
