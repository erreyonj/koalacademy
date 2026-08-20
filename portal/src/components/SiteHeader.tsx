import Link from "next/link";
import { BANDS } from "@/lib/types";
import type { BandId } from "@/lib/types";

interface SiteHeaderProps {
  /** Band whose pad is marked as the current page, if any. */
  activeBand?: BandId;
}

export function SiteHeader({ activeBand }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/">
          <img
            src="/assets/ka-main-smile-decal-no-bg.png"
            alt=""
            width={32}
            height={32}
          />
          <span>
            <span className="brand-k">K</span>oalacademy Portal
          </span>
        </Link>
        <nav className="band-nav" aria-label="Grade bands">
          {BANDS.map((band) => (
            <Link
              key={band.id}
              href={`/grades/${band.id}/`}
              aria-current={band.id === activeBand ? "page" : undefined}
            >
              {band.short}
            </Link>
          ))}
          <a
            className="site-link-external"
            href="https://koalacademy-web.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Site
          </a>
        </nav>
      </div>
    </header>
  );
}
