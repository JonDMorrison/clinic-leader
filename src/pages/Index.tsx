import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import { HeroSection } from "@/components/landing/HeroSection";
import { TheMoment } from "@/components/landing/TheMoment";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { RealExamples } from "@/components/landing/RealExamples";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTASection } from "@/components/landing/CTASection";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>ClinicLeader — Weekly Metrics to Structured Decisions</title>
        <meta name="description" content="ClinicLeader turns your weekly clinic metrics into structured decisions, clear ownership, and measurable results. Not another dashboard. A leadership operating system." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded">
          Skip to content
        </a>

        <NavPublic />

        <main id="main-content" className="flex-1">
          <HeroSection />
          <TheMoment />
          <FeatureShowcase />
          <RealExamples />
          <HowItWorks />
          <CTASection />

          {/* Contact */}
          <section id="contact" className="py-12 bg-muted/30 border-t border-border/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center">
                <motion.a
                  href="mailto:hello@clinicleader.com"
                  className="flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg group"
                  whileHover={{ scale: 1.02 }}
                >
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    hello@clinicleader.com
                  </span>
                </motion.a>
              </div>
            </div>
          </section>
        </main>

        <FooterPublic />
      </div>
    </>
  );
};

export default Index;
