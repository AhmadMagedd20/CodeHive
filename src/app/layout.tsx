import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Brand kit v1.0: Inter Tight carries the whole system — display weights run
// heavy (800/900) and always tracked negatively; body is 400/500.
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-inter-tight",
  display: "swap",
});

// Monospace is JetBrains Mono — code blocks, the code editor, InstaPay handles.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
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
      className={`${interTight.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
