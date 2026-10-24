import type { ReactNode } from "react";
import { GlassScreen } from "@/components/GlassScreen";
import { LedText } from "@/components/LedText";

interface StubPageProps {
  eyebrow: string;
  title: string;
  lede: string;
  lcd: string;
  children?: ReactNode;
}

export function StubPage({ eyebrow, title, lede, lcd, children }: StubPageProps) {
  return (
    <>
      <GlassScreen>
          <LedText as="p" className="eyebrow" text={eyebrow} />
          <LedText as="h1" className="page-title" text={title} />
          <LedText as="p" className="page-lede" text={lede} />
      </GlassScreen>

      <div className="section">
        <div className="wrap">
          <div className="stub-plate">
            <p className="stub-readout">{lcd}</p>
            {children ?? (
              <p>Nothing lives here yet. This page is a hold for the next pass.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
