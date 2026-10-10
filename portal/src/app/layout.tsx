import type { Metadata, Viewport } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import "./globals.css";

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("ka-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;

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
      className={cn(outfit.variable, spaceGrotesk.variable, "font-sans")}
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
