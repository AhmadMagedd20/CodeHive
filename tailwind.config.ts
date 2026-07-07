import type { Config } from "tailwindcss";

/**
 * Supporting accent families — "natural dye" palette beside the sage/moss core.
 * Each has: soft (tint background), DEFAULT (fills/icons), strong (text on soft
 * — all strong-on-soft pairs meet WCAG AA ≥4.5:1).
 * Exposed twice: by hue name (clay/amber/mist/rust/fern) and by semantic alias
 * (warning/highlight/info/danger/success). Components should use the SEMANTIC
 * names so meaning stays consistent app-wide.
 */
const clay = { soft: "#FCE1CC", DEFAULT: "#E27B3E", strong: "#9A4A1C" }; // bright terracotta
const amber = { soft: "#FCEEBE", DEFAULT: "#F2B01E", strong: "#8A5804" }; // marigold gold
const mist = { soft: "#D3E7EC", DEFAULT: "#2E93AB", strong: "#175B6C" }; // vivid teal
const rust = { soft: "#FBD6C9", DEFAULT: "#DB4325", strong: "#8E2810" }; // vermillion
const fern = { soft: "#DBEFC1", DEFAULT: "#5EA62B", strong: "#356315" }; // grass green

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
        sans: ["var(--font-jost)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fredoka)", "var(--font-jost)", "sans-serif"],
      },
      colors: {
        // --- Cohort Portal brand palette (reusable app-wide) ---------------
        sage: {
          DEFAULT: "#9FAE8C", // primary surface
          light: "#B8C4A8", // hover backgrounds
        },
        moss: {
          DEFAULT: "#6F7E5B", // accent / depth
          dark: "#5C6B4A", // pressed / hover
        },
        bark: {
          DEFAULT: "#34402A", // text / ink, footer
          dark: "#232B1C", // darkest band / pressed
        },
        cream: "#F3EEDB", // type-on-sage
        fog: "#EFEAD6", // card / light section bg
        paper: "#FAF7EE", // lightest off-white section bg

        // --- Supporting accents (hue names) ---------------------------------
        clay,
        amber,
        mist,
        rust,
        fern,

        // --- Semantic tokens (use THESE in components) ----------------------
        success: fern, // passed, active, completed, granted
        warning: clay, // due soon, pending, gating, awaiting action
        danger: rust, // late, rejected, failed, destructive
        info: mist, // locked, scheduled, informational
        highlight: amber, // streaks, badges, celebration, featured
        brand: {
          DEFAULT: "#6F7E5B", // Moss
          sage: "#9FAE8C",
          moss: "#6F7E5B",
          bark: "#34402A",
          cream: "#F3EEDB",
          fog: "#EFEAD6",
        },
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
        arch: "999px 999px 0 0", // the brand gate/arch motif
      },
      // Warm, bark-tinted elevation — never gray-black. Deeper for real depth.
      boxShadow: {
        hairline: "inset 0 0 0 1px rgba(52,64,42,0.09)",
        lift: "0 1px 2px rgba(52,64,42,0.06), 0 7px 20px -5px rgba(52,64,42,0.18)",
        raised: "0 3px 8px rgba(52,64,42,0.10), 0 22px 48px -14px rgba(52,64,42,0.30)",
        glow: "0 12px 34px -6px rgba(94,166,43,0.5)", // lit-green glow (hover CTAs)
        "glow-gold": "0 12px 34px -6px rgba(242,176,30,0.55)",
      },
      backgroundImage: {
        // Energetic gradients — the app's new life.
        energy: "linear-gradient(135deg, #7FB53B 0%, #5C6B4A 100%)", // lit green → moss (CTAs)
        sunset: "linear-gradient(135deg, #F2B01E 0%, #E27B3E 55%, #DB4325 100%)", // gold→clay→rust
        "arch-warm": "linear-gradient(180deg, #F2B01E 0%, #E27B3E 100%)", // arch glow
        "arch-fresh": "linear-gradient(180deg, #7FB53B 0%, #5EA62B 100%)", // fresh-green arch
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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
