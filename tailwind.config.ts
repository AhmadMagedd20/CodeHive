import type { Config } from "tailwindcss";

/*
 * === Design system (2026) — bold / friendly / high-contrast ===================
 * Saturated block-color card fills on an off-white canvas, near-black ink, and a
 * flame-orange primary. Card fills (sunny/lilac/sky/mint) are equal-lightness
 * siblings. Semantic triples keep soft(bg)/DEFAULT(fill)/strong(text-on-soft),
 * all strong-on-soft AA ≥ 4.5:1.
 */
const flameC = { soft: "#FFE4DC", DEFAULT: "#FF5734", strong: "#B32E13" }; // primary action orange
const sunnyC = { soft: "#FFF3C7", DEFAULT: "#FCCC42", strong: "#7A5B00" }; // yellow fill / highlight
const lilacC = { soft: "#ECE1FC", DEFAULT: "#BE94F5", strong: "#4B2A80" }; // purple fill / locked-info
const skyC = { soft: "#DCEEFB", DEFAULT: "#73C2FB", strong: "#0B4C81" }; // blue card fill
const mintC = { soft: "#DAF3E6", DEFAULT: "#7FD9A6", strong: "#0E6B41" }; // mint card fill
const grassC = { soft: "#DAF3E6", DEFAULT: "#1FA25A", strong: "#0E6B41" }; // success (white-legible)
const berryC = { soft: "#FBD9DD", DEFAULT: "#E23744", strong: "#8E1B23" }; // danger (distinct from flame)

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter-tight)", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-inter-tight)", "Helvetica", "Arial", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      /*
       * Brand type scale (kit §03). Each token bakes in the mandated weight,
       * tracking and leading, so a heading can never be shipped with the wrong
       * tracking. Display type is ALWAYS tracked negatively — never letterspace
       * display type positively, at any size.
       */
      fontSize: {
        hero: ["clamp(2.75rem, 7.5vw, 14.5rem)", { lineHeight: "0.92", letterSpacing: "-0.04em", fontWeight: "900" }],
        section: ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "900" }],
        subsection: ["clamp(1.75rem, 3.5vw, 2.5rem)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" }],
        "card-title": ["1.5rem", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "800" }],
        "body-lg": ["1.1875rem", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "400" }],
        caption: ["0.8125rem", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "500" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.06em", fontWeight: "700" }],
      },
      // Tracking tokens for display type that keeps a bespoke size. Display is
      // NEVER letterspaced positively — `eyebrow` is the one exception, and it
      // is not display type.
      letterSpacing: {
        hero: "-0.04em",
        display: "-0.03em",
        body: "-0.01em",
        eyebrow: "0.06em",
      },
      colors: {
        // --- NEW core palette ----------------------------------------------
        ink: { DEFAULT: "#151313", soft: "#2A2626" }, // near-black surfaces/text
        flame: flameC, // primary action orange
        lilac: lilacC, // category/card fill
        sunny: sunnyC, // category/card fill, active highlight
        sky: skyC, // card fill
        mint: mintC, // card fill
        paper: "#F7F7F5", // app off-white canvas
        // white is #FFFFFF (Tailwind default)

        // --- Semantic tokens (mapped onto the palette above) ---------------
        success: grassC, // passed, active, completed, granted
        warning: sunnyC, // due soon, pending, gating, awaiting action
        danger: berryC, // late, rejected, failed (distinct from flame primary)
        info: lilacC, // locked, scheduled, informational
        highlight: sunnyC, // streaks, badges, celebration, featured
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "22px", // signature chunky-rounded card
      },
      // "Brutal" outline — the neo-brutalist signature: a solid 2px ink border on
      // every component (cards, buttons, inputs, pills, avatars, progress bars).
      // Pair with `border-ink` for color: `border-brutal border-ink`. One weight,
      // used everywhere, so it stays a single token to tune instead of a per-file hunt.
      borderWidth: {
        brutal: "2px",
      },
      // Ink-tinted elevation — mostly flat + crisp borders; soft shadow when floating.
      boxShadow: {
        hairline: "inset 0 0 0 1px rgba(21,19,19,0.09)",
        lift: "0 1px 2px rgba(21,19,19,0.06), 0 7px 20px -5px rgba(21,19,19,0.18)",
        soft: "0 10px 30px -12px rgba(21,19,19,0.22)",
        "soft-lg": "0 20px 50px -18px rgba(21,19,19,0.28)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        // App-side motion language (mirrors the landing: fade + upward slide).
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 6s ease-in-out infinite",
        float: "float 12s ease-in-out infinite",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "grow-x": "grow-x 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        pop: "pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "spin-slow": "spin 22s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
