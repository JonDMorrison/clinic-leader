import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import {
  ArrowRight,
  ArrowLeft,
  Database,
  CheckCircle2,
  MessageSquare,
  FileText,
  Settings,
  Play,
} from "lucide-react";

const howItWorks = [
  {
    icon: MessageSquare,
    title: "Discovery call",
    description: "We discuss your EMR, available reports, and the operational metrics you want to track.",
  },
  {
    icon: FileText,
    title: "Start with core KPIs",
    description: "We map a small set of key metrics first — visits, revenue, utilization — and expand over time.",
  },
  {
    icon: Settings,
    title: "Configure & launch",
    description: "Set up your upload schedule and start your weekly leadership loop.",
  },
];

const whatWeNeed = [
  { title: "Appointment data", desc: "Visits, no-shows, cancellations by provider or service" },
  { title: "Revenue metrics", desc: "Collections, charges, payment timing (where available)" },
  { title: "Schedule utilization", desc: "Booked vs available appointment slots" },
  { title: "Patient flow", desc: "New patients, retention signals, reactivations" },
];

const EMRIntegration = () => {
  return (
    <>
      <Helmet>
        <title>Other EMRs - ClinicLeader | Connect Your Practice Management System</title>
        <meta
          name="description"
          content="Connect your EMR or practice management system to ClinicLeader. We map your operational metrics into scorecards and leadership tools."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <NavPublic />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Link 
                  to="/integrations" 
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Integrations
                </Link>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Database className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold">Other EMRs</h1>
                    <p className="text-muted-foreground">Connect your practice management system</p>
                  </div>
                </div>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  Using a different EMR or practice management system? We can work with you to map 
                  your operational metrics into ClinicLeader — start small and expand over time.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      <Play className="mr-2 w-5 h-5" />
                      Book a Walkthrough
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 group" asChild>
                    <Link to="/auth">
                      Apply for Pilot Access
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How Custom Integration Works</h2>
                <p className="text-lg text-muted-foreground">
                  We start with core KPIs and expand over time.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {howItWorks.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-card rounded-2xl border border-border/50 text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* What We Typically Need */}
          <section className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Typically Need</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Most EMRs can export the operational data ClinicLeader uses. We do NOT require patient names, 
                  clinical notes, or PHI.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {whatWeNeed.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border/50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <Database className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl md:text-4xl font-bold">
                  Let's discuss your EMR
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Book a walkthrough and we'll explore how to connect your system to ClinicLeader.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="text-lg px-10 py-7 shadow-xl shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      Book a Walkthrough
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <FooterPublic />
      </div>
    </>
  );
};

export default EMRIntegration;
