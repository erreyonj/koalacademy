import type { MDXComponents } from "mdx/types";
import { Activate } from "@/components/Activate";
import { Break } from "@/components/Break";
import { DoNow } from "@/components/DoNow";
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
    Break,
    DoNow,
    NotationExcerpt,
    YouTubeEmbed,
  };
}
