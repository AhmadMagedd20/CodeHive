import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { SaleBanner } from "@/components/landing/sale-banner";
import { BeforeAfter } from "@/components/landing/before-after";
import { FreeLessons } from "@/components/landing/free-lessons";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Proof } from "@/components/landing/proof";
import { PathPicker } from "@/components/landing/path-picker";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";
import { getHeroVideo } from "@/lib/hero-video";

// Public marketing landing page. Conversion order: outcome (hero) → urgency
// (sale) → pain/after (before-after) → risk reversal (free lessons) →
// outcomes detail (showcase) → proof (track record + testimonials) →
// self-route (path picker) → process reassurance (how it works) → final CTA.
export const dynamic = "force-dynamic";

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
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
