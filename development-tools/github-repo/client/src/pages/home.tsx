import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Hero from "@/components/sections/hero";
import About from "@/components/sections/about";
import Team from "@/components/sections/team";
import Contact from "@/components/sections/contact";
import FAQ from "@/components/sections/faq";
import MarketOverview from "@/components/sections/market-overview";
import GettingStarted from "@/components/sections/getting-started";
import TrustNews from "@/components/sections/trust-news";
import MobileApp from "@/components/sections/mobile-app";
import Partners from "@/components/sections/partners";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col w-full min-w-full overflow-x-hidden">
      <Header />
      <main className="flex-1 w-full min-w-full">
        <Hero />
        <MarketOverview />
        <GettingStarted />
        <About />
        <TrustNews />
        <Partners />
        <MobileApp />
        <Team />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}