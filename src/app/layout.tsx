import type { Metadata } from "next";
import { Fredoka, Jost } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cohort Portal — Learn It Once. Actually Get It.",
    template: "%s — Cohort Portal",
  },
  description:
    "Cohort Portal is where Megz's students get everything in one place — VOD sessions, solved LeetCode, live lab walk-throughs, and real follow-up.",
};

// Dark-mode toggle is removed for now — force the light theme everywhere and
// clear any previously stored preference so no one is stuck in dark.
const themeInit = `
try {
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('theme');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fredoka.variable} ${jost.variable} scroll-smooth`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
