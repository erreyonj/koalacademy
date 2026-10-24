import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Outfit, Space_Grotesk, Orbitron } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import "./globals.css";

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("ka-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");var pal={pop:["#f56e8f","#b04f67","#f56e8f","#000000","#b04f67"],mist:["#c0cbe1","#8a92a2","#c0cbe1","#000000","#8a92a2"],slate:["#99a4b8","#6e7684","#99a4b8","#000000","#000000"],charcoal:["#979da8","#535863","#737a89","#000000","#535863"],eucalyptus:["#a8c3b0","#798c7f","#a8c3b0","#000000","#798c7f"],leaf:["#79a393","#426759","#5b8f7b","#000000","#426759"],canopy:["#8ba099","#223e34","#2f5648","#ffffff","#2f5648"],pith:["#ede4d4","#aba499","#ede4d4","#000000","#aba499"],bamboo:["#d4c4a8","#998d79","#d4c4a8","#000000","#998d79"],culm:["#ad9775","#79684e","#a8906c","#000000","#79684e"],bark:["#a5998a","#4f4130","#6e5a42","#ffffff","#6e5a42"],sky:["#a9c6e8","#7a8fa7","#a9c6e8","#000000","#7a8fa7"],yellow:["#e3b23c","#a3802b","#e3b23c","#000000","#a3802b"],red:["#e08077","#9c4840","#d96459","#000000","#9c4840"],"custom-001":["#ff6b81","#0a0c0b","#1c332c","#f3f3f3","#ff6b81"]};var alias={pink:"pop",butter:"yellow",mint:"eucalyptus",lilac:"pop",peach:"bamboo",orange:"red",lime:"leaf",cyan:"sky",violet:"pop"};var skins={"custom-001":"custom-001"};var id=localStorage.getItem("ka-backlight-"+t);if(alias[id])id=alias[id];var pair=pal[id]||pal.pop;var root=document.documentElement;root.style.setProperty("--ka-backlight",pair[0]);root.style.setProperty("--ka-backlight-deep",pair[1]);root.style.setProperty("--ka-backlight-face",pair[2]);root.style.setProperty("--ka-backlight-ink",pair[3]);root.style.setProperty("--ka-backlight-mark",pair[4]);if(skins[id])root.dataset.skin=skins[id];else delete root.dataset.skin;}catch(e){}})();`;

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tektur",
  display: "swap",
});

const tickingTimebomb = localFont({
  src: "../../public/fonts/ticking-timebomb-bb-font/TickingTimebombBb-RB0l.ttf",
  variable: "--font-turret",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Koalacademy Portal",
    template: "%s — Koalacademy Portal",
  },
  description:
    "Lesson slides for the Koalacademy K–8 music pilot: the concept, the listening, and the game, on a phone or a projector.",
  icons: { icon: "/assets/ka-main-smile-decal-no-bg.png" },
  // The pilot's material stays off search engines until the class link is settled.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2f5648" },
    { media: "(prefers-color-scheme: dark)", color: "#171a21" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(outfit.variable, spaceGrotesk.variable, orbitron.variable, tickingTimebomb.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
