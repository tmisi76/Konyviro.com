import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
// import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/pricing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { REFERRAL_STORAGE_KEY } from "@/constants/referral";

const Index = () => {
  const [searchParams] = useSearchParams();

  // Store referral code if present in URL for later registration
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode.toUpperCase());
      console.log("Referral code stored from landing:", refCode.toUpperCase());
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      {/* <TestimonialsSection /> */}
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
