import type { ReactNode } from "react";

export const DO_NOW_MATERIALS = {
  headphones: { emoji: "🎧", label: "headphones" },
  ipad: { emoji: "📱", label: "iPad" },
  journal: { emoji: "📓", label: "journal" },
  write: { emoji: "✍🏾", label: "write" },
  look: { emoji: "👀", label: "look" },
  partner: { emoji: "👥", label: "partner" },
} as const;

export type DoNowMaterial = keyof typeof DO_NOW_MATERIALS;

interface DoNowProps {
  /** Short name for the posted work, e.g. "Easy and hard". */
  title: string;
  /**
   * Materials in sequence groups. Groups render with an arrow between them:
   * `[["headphones", "ipad"], ["journal", "write"]]` → 🎧+📱 ➡️ 📓+✍🏾
   */
  materials: DoNowMaterial[][];
  children: ReactNode;
}

function groupLabel(group: DoNowMaterial[]): string {
  return group
    .map((token) => DO_NOW_MATERIALS[token]?.label ?? token)
    .join(" and ");
}

function materialsLabel(materials: DoNowMaterial[][]): string {
  const sentence = materials.map(groupLabel).join(", then ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Posted work at the top of every lesson. Runs during Threshold. */
export function DoNow({ title, materials, children }: DoNowProps) {
  return (
    <section className="donow-block">
      <p className="eyebrow">Do Now · {title}</p>
      <p className="donow-materials">
        <span className="sr-only">{materialsLabel(materials)}</span>
        <span aria-hidden="true" className="donow-materials-visual">
          {materials.map((group, groupIndex) => (
            <span key={groupIndex} className="donow-materials-group">
              {groupIndex > 0 ? (
                <span className="donow-materials-arrow">➡️</span>
              ) : null}
              {group.map((token, tokenIndex) => {
                const item = DO_NOW_MATERIALS[token];
                return (
                  <span key={`${token}-${tokenIndex}`} className="donow-materials-item">
                    {tokenIndex > 0 ? (
                      <span className="donow-materials-plus">+</span>
                    ) : null}
                    <span>{item?.emoji ?? token}</span>
                  </span>
                );
              })}
            </span>
          ))}
        </span>
      </p>
      {children}
    </section>
  );
}
