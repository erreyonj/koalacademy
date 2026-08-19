import type { MDXComponents } from "mdx/types";
import { Break } from "@/components/Break";
import { Do } from "@/components/Do";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

/**
 * Components available to every .mdx lesson without an import, so authoring a
 * slide stays close to writing Markdown.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Break,
    Do,
    YouTubeEmbed,
  };
}
