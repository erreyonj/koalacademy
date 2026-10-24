import type { ReactNode } from "react";
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
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text={eyebrow} />
          <LedText as="h1" className="page-title" text={title} />
          <LedText as="p" className="page-lede" text={lede} />
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          <div className="deck-screen">
            <span className="lcd">{lcd}</span>
          </div>
          {children ?? (
            <div className="empty-note">
              <p>Nothing lives here yet. This page is a hold for the next pass.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
