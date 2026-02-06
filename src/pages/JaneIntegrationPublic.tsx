import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import {
  ArrowRight,
  ArrowLeft,
  Cloud,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  BarChart3,
  Settings,
  Star,
} from "lucide-react";

const features = [
  {
    title: "Automatic daily updates",
    description: "Scorecards refresh automatically with your latest Jane data—no manual exports needed.",
  },
  {
    title: "No credentials required",
    description: "Jane's secure data delivery means you never share login credentials with ClinicLeader.",
  },
  {
    title: "Operational metrics only",
    description: "We focus on visits, revenue, utilization, and scheduling—not clinical notes or PHI.",
  },
  {
    title: "15-minute setup",
    description: "Guided wizard walks you through connecting your Jane clinic to ClinicLeader.",
  },
];

const metrics = [
  "Visits by provider, discipline, and location",
  "Revenue and collections tracking",
  "Schedule utilization rates",
  "Cancellation and no-show patterns",
  "New patient flow and retention signals",
  "Appointment booking trends",
];

const JaneIntegrationPublic = () => {
  return (
    <>
      <Helmet>
        <title>Jane App Integration - ClinicLeader | Automatic Clinic Scorecards</title>
        <meta
          name="description"
          content="Connect Jane App to ClinicLeader for automatic scorecards and operational insights. No credentials required. 15-minute setup."
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
                    <Cloud className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-3xl md:text-4xl font-bold">Jane App</h1>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Featured
                      </span>
                    </div>
                    <p className="text-muted-foreground">Automatic scorecards from your Jane data</p>
                  </div>
                </div>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  Connect your Jane clinic to ClinicLeader and get automatic performance scorecards, 
                  issue detection, and improvement tracking—without changing how you use Jane.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="group" asChild>
                    <Link to="/auth">
                      Apply for Pilot Access
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/auth">
                      Book a Walkthrough
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Key Features */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How Jane Integration Works</h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {features.map((feature, i) => (
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
                      <div className="font-semibold mb-1">{feature.title}</div>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Metrics Available */}
          <section className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Scorecard Metrics</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What You Can Track</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Jane integration provides the operational metrics your leadership team needs.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-4">
                {metrics.map((metric, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/50"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Setup Steps */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">15-Minute Setup</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Getting Started</h2>
              </motion.div>

              <div className="space-y-4">
                {[
                  { step: 1, title: "Create your ClinicLeader account", desc: "Sign up and set up your organization" },
                  { step: 2, title: "Start the Jane setup wizard", desc: "Follow the guided steps to configure data delivery" },
                  { step: 3, title: "Enable data delivery in Jane", desc: "One-time configuration in your Jane admin settings" },
                  { step: 4, title: "Start your leadership loop", desc: "Scorecards populate automatically—you're ready to go" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Data & Privacy</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Data Stays Safe</h2>
              </motion.div>

              <div className="space-y-4">
                {[
                  "No patient names, emails, or phone numbers stored",
                  "Clinical notes and PHI are excluded from data delivery",
                  "Jane's secure export—no credentials shared with ClinicLeader",
                  "You control exactly which metrics are tracked",
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50"
                  >
                    <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-24 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
            <motion.div
              className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                className="text-center space-y-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Zap className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Ready to connect your Jane clinic?
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="text-lg px-10 py-7 shadow-xl shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      Apply for Pilot Access
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-10 py-7 bg-card/80 backdrop-blur-sm" asChild>
                    <Link to="/auth">
                      Book a Walkthrough
                    </Link>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground pt-4">
                  15-minute setup • No credentials required • HIPAA-aligned
                </p>
              </motion.div>
            </div>
          </section>
        </main>

        <FooterPublic />
      </div>
    </>
  );
};

export default JaneIntegrationPublic;
