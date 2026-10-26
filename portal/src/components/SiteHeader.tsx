import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/dashboard/">
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
      </div>
    </header>
  );
}
