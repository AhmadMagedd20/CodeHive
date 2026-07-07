import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";

// Public marketing landing page. CTAs point to the existing /register and
// /login routes from the auth module.
export default function Home() {
  return (
    <div className="texture-grain relative min-h-screen overflow-x-clip bg-paper text-bark">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Features />
        <HowItWorks />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
