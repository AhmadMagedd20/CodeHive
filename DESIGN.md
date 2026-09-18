# Cohort Portal — Design System

**Direction:** bold, friendly, high-contrast. Saturated block-colour cards on an off-white canvas,
near-black ink, flame-orange as the single action colour, and a solid black outline on everything —
a soft/neo-brutalist look aimed at university students.

Source of truth: `tailwind.config.ts` (tokens), `src/app/globals.css` (CSS vars + utilities),
`src/app/layout.tsx` (font). This file documents what's actually in the code.

---

## 1. Colour palette

### Core

| Token | Hex | Role |
| ----- | --- | ---- |
| `ink` | `#151313` | Near-black. Text, rails, dark panels, **every border** |
| `ink-soft` | `#2A2626` | Slightly lifted ink surface |
| `flame` | `#FF5734` | Primary action — buttons, CTAs, progress fill, focus ring |
| `sunny` | `#FCCC42` | Card fill · active nav highlight · warnings |
| `lilac` | `#BE94F5` | Card fill · locked/gated/info |
| `sky` | `#73C2FB` | Card fill |
| `mint` | `#7FD9A6` | Card fill · owned/complete |
| `paper` | `#F7F7F5` | App canvas (never pure white) |
| `white` | `#FFFFFF` | Card surfaces sitting on paper |

`sunny` / `lilac` / `sky` / `mint` are **equal-lightness siblings** — they read as a set, so a wall
of course cards feels intentional rather than random.

### Full triples

Every accent ships `soft` (tint background) / `DEFAULT` (fill) / `strong` (text on soft).
**Every `strong`-on-`soft` pair meets WCAG AA ≥ 4.5:1.**

| Family | soft | DEFAULT | strong |
| ------ | ---- | ------- | ------ |
| flame | `#FFE4DC` | `#FF5734` | `#B32E13` |
| sunny | `#FFF3C7` | `#FCCC42` | `#7A5B00` |
| lilac | `#ECE1FC` | `#BE94F5` | `#4B2A80` |
| sky | `#DCEEFB` | `#73C2FB` | `#0B4C81` |
| mint | `#DAF3E6` | `#7FD9A6` | `#0E6B41` |
| grass *(success)* | `#DAF3E6` | `#1FA25A` | `#0E6B41` |
| berry *(danger)* | `#FBD9DD` | `#E23744` | `#8E1B23` |

### Semantic aliases

**Components should use these, not raw hues** — meaning stays consistent app-wide.

| Semantic | Maps to | Used for |
| -------- | ------- | -------- |
| `success` | grass | passed, active, completed, granted, owned |
| `warning` | sunny | due soon, pending review, gating, awaiting action |
| `danger` / `destructive` | berry | late, rejected, failed |
| `info` | lilac | locked, scheduled, drip-gated |
| `highlight` | sunny | streaks, badges, celebration, featured |

> **Why danger ≠ flame.** Flame is the *primary action* colour. Reusing it for errors makes
> "do this" and "something broke" look identical, so danger is a separate berry red.

### shadcn CSS variables (`globals.css`, HSL)

```css
--background: 60 6% 96%;    /* paper   */   --foreground: 0 5% 8%;    /* ink    */
--card: 0 0% 100%;          /* white   */   --card-foreground: 0 5% 8%;
--primary: 11 100% 66%;     /* flame   */   --primary-foreground: 0 0% 100%;
--secondary: 60 5% 94%;                     --muted: 60 5% 94%;
--muted-foreground: 0 0% 40%;               --accent: 60 5% 92%;
--destructive: 355 72% 55%; /* berry   */   --border / --input: 0 0% 88%;
--ring: 11 100% 66%;        /* flame   */   --radius: 1rem;
```

**No dark theme.** The app forces the light canvas and clears any stored preference
(`RootLayout` → `themeInit`).

---

## 2. Typography

**One family, differentiated by weight: [Kodchasan](https://fonts.google.com/specimen/Kodchasan)**
(rounded geometric sans), loaded via `next/font/google`, weights **400 / 500 / 600 / 700**,
`display: swap`, exposed as `--font-kodchasan`.

Both `font-sans` and `font-display` point at it — headings are heavy and tight, body is regular.
Fallbacks: `ui-rounded, system-ui, sans-serif`.

| Use | Classes |
| --- | ------- |
| Hero headline | `font-display text-[2.6rem] sm:text-6xl lg:text-[4.2rem] font-bold leading-[1.05] tracking-tight` |
| Page title | `font-display text-3xl font-semibold tracking-tight` |
| Card title | `font-display text-xl sm:text-2xl font-bold leading-tight` |
| Body | `text-sm` / `text-base leading-relaxed`, `text-ink/65` |
| Meta / caption | `text-xs text-ink/45` – `text-ink/55` |
| Eyebrow / pill | `text-[11px] font-semibold uppercase tracking-wide` |

> ⚠️ **Known trap.** Tailwind's arbitrary sizes (`text-[4.2rem]`) ship an implicit `line-height: 1`
> that silently overrides `leading-*`. Combined with `background-clip: text` this **clips descenders**
> (y, g, p, j, q). See `.text-gradient` below.

---

## 3. The signature: brutal outline

The defining trait. A **solid 2px ink border on every component** — cards, buttons, inputs, pills,
badges, avatars, progress bars, tooltips.

```js
borderWidth: { brutal: "2px" }   // usage: className="border-brutal border-ink"
```

One weight everywhere, one token to tune. Deliberately **not** a colour-tinted or opacity-based
border (`border-black/10` etc.) — those read as timid and were swept out.

---

## 4. Shape & elevation

```js
borderRadius: {
  card: "22px",                    // signature chunky-rounded card
  lg: "var(--radius)",             // 1rem
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
}
```

Buttons and pills are **fully rounded** (`rounded-full`). Icon tiles use `rounded-2xl`.
Floating rails use `rounded-[28px]`.

```js
boxShadow: {
  hairline: "inset 0 0 0 1px rgba(21,19,19,0.09)",
  lift:     "0 1px 2px rgba(21,19,19,0.06), 0 7px 20px -5px rgba(21,19,19,0.18)",
  soft:     "0 10px 30px -12px rgba(21,19,19,0.22)",
  "soft-lg":"0 20px 50px -18px rgba(21,19,19,0.28)",
}
```

Shadows are **ink-tinted, never grey-black**. The system is mostly flat + crisp borders; shadow is
reserved for genuinely floating things (rails, modals, hover lift).

---

## 5. Motion

```js
keyframes / animation:
  rise      0.5s  cubic-bezier(0.22, 1, 0.36, 1)   // fade + 14px slide up
  grow-x    0.8s  cubic-bezier(0.22, 1, 0.36, 1)   // progress bars (origin-left)
  pop       0.45s cubic-bezier(0.22, 1, 0.36, 1)   // completion celebration
  shimmer   6s    ease-in-out infinite             // gradient text sweep
  float     12s   ease-in-out infinite             // hero glow blobs
  spin-slow 22s   linear infinite                  // rotating SALE badge
  accordion-down/up 0.2s ease-out
```

**Easing is always `cubic-bezier(0.22, 1, 0.36, 1)`** — a fast-out, gentle-settle curve.

Interaction defaults: buttons `active:scale-[0.97]` + `hover:-translate-y-px`; cards
`hover:-translate-y-1`; links `hover:scale-[1.03]`.

`prefers-reduced-motion` is respected throughout — scroll reveals, the hero video autoplay, and the
dock magnification all fall back to static.

---

## 6. Utilities (`globals.css`)

| Class | What it does |
| ----- | ------------ |
| `.text-gradient` | Flame→sunny→flame sweep on text (`linear-gradient(100deg, #ff5734, #fccc42, #ff5734)`), pair with `animate-shimmer` |
| `.text-gradient-light` | Sunny→white→sunny, for gradient text on ink backgrounds |
| `.dot-grid` | Faint dot field, `rgba(21,19,19,0.09)` 1px dots on a 22px grid |
| `.texture-grain` | Whisper of SVG fractal noise (opacity 0.35) so surfaces aren't dead flat |
| `.stagger-children` | Sequential `rise` on direct children |

**Both gradient classes carry `padding-block: 0.22em; margin-block: -0.22em`.** `background-clip:
text` only paints inside the element's own box, so a tight heading line-height crops glyph tails.
The padding grows the paint box, the negative margin gives the space back — descenders render with
**zero** layout shift.

---

## 7. Component specs

### Buttons (`ui/button.tsx`)

Base: `inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all duration-200
active:scale-[0.97]`, focus ring `ring-2 ring-ring ring-offset-2`.

| Variant | Style |
| ------- | ----- |
| `default` | `border-brutal border-ink bg-flame text-white shadow-soft hover:-translate-y-px` |
| `destructive` | `border-brutal border-ink bg-destructive text-destructive-foreground shadow-soft` |
| `outline` | `border-brutal border-ink bg-white text-ink hover:bg-paper` |
| `secondary` | `border-brutal border-ink bg-secondary` |
| `ghost` | `hover:bg-accent` (no border — intentionally chrome-less) |
| `link` | `text-flame underline-offset-4 hover:underline` |

Sizes: `default h-10 px-5` · `sm h-9 px-4` · `lg h-11 px-8` · `icon h-10 w-10`

### Badges / pills (`ui/badge.tsx`)

`rounded-full border-brutal border-ink px-2.5 py-0.5 text-xs font-semibold` + a semantic
`bg-*-soft text-*-strong` pair. Variants: `default · secondary · success · warning · danger ·
destructive · info · highlight · outline`.

### Course cards (`course-card.tsx`)

`rounded-card border-brutal border-ink p-5` on one of four fills, cycled **deterministically by
category** so a subject keeps its colour everywhere:

```ts
CARD_FILLS = ["sunny", "lilac", "sky", "mint"]
categoryFill(category)  // stable string hash → same colour every render
```

Anatomy: category pill (top-left) · bookmark toggle (top-right) · title · ink progress bar ·
lessons-left indicator (bottom-left) · flame CTA pill (bottom-right).

> The reference design had a stack of enrolled-peer avatars bottom-left. Replaced with a real
> lessons-left indicator — we have no peer data, and showing other students would be a privacy issue.

### Icon rail (`icon-rail.tsx`)

One shared component for student *and* admin. Floating `fixed inset-y-3 left-3 w-[68px]
rounded-[28px] bg-ink`, collapsing to a bottom bar under `md`.

- Active item: `bg-sunny text-ink`. Inactive: `text-white/55 hover:bg-white/10`.
- Logo: flame `rounded-2xl` "C".
- **Tooltips** — white pill with brutal border, to the right, on hover *and* keyboard focus.
  CSS-only with an enter-only delay (300ms in, instant out).
- **macOS-Dock magnification** — hovered icon `1.42×`, immediate neighbour `1.21×`, back to `1.0`
  two icons out, plus a 7px lean out of the rail. Driven by one rAF loop writing `transform`
  directly, so a mouse sweep causes zero React re-renders and zero layout reflow.

### Inputs

`h-10 rounded-md border-brutal border-ink bg-background px-3 py-2 text-sm`, focus
`ring-2 ring-ring ring-offset-2`, invalid `border-destructive`.

### Avatars (`ui/avatar.tsx`)

`rounded-full border-brutal border-ink font-display font-bold`, tone from the card-fill set.
Sizes `sm h-7 w-7` / `md h-9 w-9`.

---

## 8. Rules of thumb

1. **Semantic over literal** — `bg-warning-soft text-warning-strong`, never a raw hex.
2. **Everything gets the outline** — `border-brutal border-ink`. If it looks like a component, it has one.
3. **Paper, not white, is the canvas.** White is for cards sitting *on* paper.
4. **One action colour.** Flame means "do this". Don't use it for status.
5. **Flat by default.** Reach for shadow only when something genuinely floats.
6. **Colour carries meaning, not decoration** — a card's fill encodes its category; a pill's fill encodes state.
7. **No invented data.** No fake testimonials, peer counts, or ratings.
