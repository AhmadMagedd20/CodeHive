import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { SaleBanner } from "@/components/landing/sale-banner";
import { BeforeAfter } from "@/components/landing/before-after";
import { FreeLessons } from "@/components/landing/free-lessons";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Proof } from "@/components/landing/proof";
import { PathPicker } from "@/components/landing/path-picker";
import { HowItWorks } from "@/components/landing/how-it-works";
import { InPersonClasses } from "@/components/landing/in-person";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";
import { getHeroVideo } from "@/lib/hero-video";

// Public marketing landing page. Conversion order: outcome (hero) → urgency
// (sale) → pain/after (before-after) → risk reversal (free lessons) →
// outcomes detail (showcase) → proof (track record + testimonials) →
// self-route (path picker) → process reassurance (how it works) → final CTA.

/**
 * Cached and revalidated every 10 minutes — NOT `force-dynamic`.
 *
 * This page is byte-identical for every visitor: nothing in the tree reads
 * `cookies()`, `headers()` or the session, so there is no per-user state that
 * could leak between them. It is safe to serve the same HTML to everyone, and
 * it must stay that way — if a component here ever needs to know who is looking
 * (a "Welcome back" navbar, say), this export has to go back to force-dynamic
 * or that component has to become a client component that fetches its own data.
 *
 * Under `force-dynamic` it was re-rendered from scratch per request, making
 * three DB round trips to eu-west-3 every time (hero video, sale banner, free
 * lessons) — on the first page anyone sees, and the one they judge the speed of.
 * Now those run at most once per 10 minutes and visitors are served cached HTML.
 *
 * 10 minutes is chosen against the shortest-lived thing on the page: the hero
 * video's signed URL, minted for 24h in `getHeroVideo()`. Any window well under
 * that is safe; going anywhere near 24h would risk serving an expired link.
 * The practical cost is that a price or sale change takes up to 10 minutes to
 * appear publicly.
 */
export const revalidate = 600;

export default async function Home() {
  const heroVideo = await getHeroVideo();
  return (
    <div className="texture-grain relative min-h-screen overflow-x-clip bg-paper text-ink">
      <Navbar />
      <main>
        <Hero heroVideo={heroVideo} />
        <SaleBanner />
        <BeforeAfter />
        <FreeLessons />
        <FeatureShowcase />
        <Proof />
        <PathPicker />
        <HowItWorks />
        <InPersonClasses />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
