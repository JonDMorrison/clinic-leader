import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { WhyDifferent } from "@/components/landing/WhyDifferent";
import { CTASection } from "@/components/landing/CTASection";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, ChevronDown } from "lucide-react";
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

  const faqs = [
    {
      q: "Do I need to follow a specific framework to use ClinicLeader?",
      a: "No. ClinicLeader provides structure inspired by proven operating systems, but you don't need formal training or certifications. The system guides you through scorecards, meetings, and improvement tracking."
    },
    {
      q: "How long does it take to get started?",
      a: "Most clinics run their first structured weekly meeting within two weeks. Setup includes connecting your data source, importing existing goals, and inviting your leadership team."
    },
    {
      q: "Will this create more work for my team?",
      a: "The opposite. ClinicLeader replaces scattered spreadsheets, fragmented meeting prep, and untracked improvement efforts. Teams spend less time gathering information and more time making decisions."
    },
    {
      q: "Is my data secure?",
      a: "Yes. Your clinic data remains yours. We use enterprise-grade encryption and follow healthcare data security best practices. Cross-clinic learning uses only anonymized, aggregated patterns - never identifiable information."
    },
    {
      q: "What data sources can ClinicLeader connect to?",
      a: "ClinicLeader connects to Jane App, other EMR systems, Excel or spreadsheet uploads, and supports manual entry for operational metrics. No disruption to your current workflows is required."
    }
  ];

  return (
    <>
      <Helmet>
        <title>ClinicLeader - Decision Intelligence for Clinic Leaders</title>
        <meta name="description" content="ClinicLeader helps clinic leaders see performance clearly, prioritize issues, track improvement changes, and learn what works. Connects to Jane, other EMRs, or spreadsheets." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded">
          Skip to content
        </a>

        <NavPublic />

        <main id="main-content" className="flex-1">
          {/* Hero Section */}
          <HeroSection />

          {/* Feature Showcase */}
          <FeatureShowcase />

          {/* Why Different */}
          <WhyDifferent />

          {/* Who It's For Section */}
          <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="space-y-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="text-center">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                    Who ClinicLeader is{" "}
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      built for
                    </span>
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: "Clinic owners", desc: "who want clarity on performance and team alignment" },
                    { title: "Practice managers", desc: "who need a system, not more spreadsheets" },
                    { title: "Leadership teams", desc: "who want meetings focused on decisions, not updates" },
                    { title: "Multi-location or multi-discipline clinics", desc: "where visibility matters" },
                    { title: "Growing clinics", desc: "ready to measure what improvement changes actually work" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-card/60 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent mt-2 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <span className="text-muted-foreground"> {item.desc}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border/50 text-center">
                  <p className="text-muted-foreground text-sm">
                    <strong className="text-foreground">Not designed for:</strong> Solo practitioners without a team, 
                    or clinics looking for scheduling or billing software. 
                    ClinicLeader is for leadership teams who want performance clarity and measurable improvement.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-24 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
            
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Got questions?</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Common questions
                </h2>
              </motion.div>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <motion.details
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors overflow-hidden"
                  >
                    <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-lg">
                      {faq.q}
                      <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-6 pb-6 -mt-2">
                      <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <CTASection />

          {/* Contact Section */}
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
