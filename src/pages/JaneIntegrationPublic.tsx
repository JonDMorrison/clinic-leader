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
  Eye,
  Target,
  Lightbulb,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  HelpCircle,
  ChevronDown,
  Star,
  Play,
} from "lucide-react";

const whatYouCanSee = [
  {
    category: "Visit & Volume Signals",
    items: [
      "Visits and trends by provider, discipline, and location (where available)",
      "Appointment volume trends and mix shifts",
      "Booking patterns over time",
    ],
  },
  {
    category: "Utilization & Capacity",
    items: [
      "Provider utilization signals",
      "Schedule fill rates (where available)",
      "Capacity trends across providers",
    ],
  },
  {
    category: "Revenue & Leading Indicators",
    items: [
      "Revenue trends (where available)",
      "Leading indicators that help you spot issues earlier",
      "Retention and flow signals (where data supports)",
    ],
  },
];

const loopBlocks = [
  {
    phase: "SEE",
    icon: Eye,
    title: "Build weekly scorecards automatically",
    description: "Jane data flows into your scorecard. No manual entry. See performance by provider, discipline, or location at a glance.",
  },
  {
    phase: "PRIORITIZE",
    icon: Target,
    title: "Turn signals into issues",
    description: "When a metric drifts off-track, create an issue with one click and add it to your next leadership meeting.",
  },
  {
    phase: "ACT",
    icon: Zap,
    title: "Track improvement changes",
    description: "Log interventions tied to specific metrics. Know what your clinic has tried, who owns it, and when it started.",
  },
  {
    phase: "LEARN",
    icon: Lightbulb,
    title: "Measure outcomes and build playbooks",
    description: "See whether changes moved the needle. Over time, build a library of what actually works for your clinic.",
  },
];

const pilotExpectations = [
  {
    icon: Users,
    title: "Limited spots",
    description: "We're working closely with a small group of clinics to shape the Jane integration.",
  },
  {
    icon: Calendar,
    title: "Close onboarding",
    description: "We walk through setup together and help you configure your first scorecard.",
  },
  {
    icon: Activity,
    title: "Feedback loops",
    description: "Your input directly influences what we build next. This is a collaboration.",
  },
  {
    icon: Clock,
    title: "Typical timeline",
    description: "First scorecard + first weekly meeting rhythm within ~2 weeks.",
  },
];

const privacyPoints = [
  {
    title: "Clinic controls access",
    description: "You decide what's connected and who on your team can see it.",
  },
  {
    title: "Operational metrics, not clinical notes",
    description: "ClinicLeader focuses on performance signals—visits, revenue, scheduling—not patient records or clinical details.",
  },
  {
    title: "Cross-clinic insights are anonymized",
    description: "If enabled, benchmarking uses only aggregated, anonymized patterns. Never identifiable data.",
  },
  {
    title: "AI summarizes; leaders decide",
    description: "AI highlights patterns and outcomes. Your leadership team always makes the final call.",
  },
];

const faqs = [
  {
    q: "Do we need to change anything in Jane?",
    a: "Minimal changes. You'll enable a data delivery option inside Jane's admin settings. ClinicLeader handles the rest. No workflow changes, no retraining your team.",
  },
  {
    q: "What if we have multiple locations?",
    a: "ClinicLeader can handle multi-location clinics. Where Jane supports location-level data, you'll see breakdowns by location in your scorecards.",
  },
  {
    q: "What if some data isn't available?",
    a: "Not every clinic has every metric. ClinicLeader adapts to what's available. We'll be transparent about what we can and can't pull from your Jane setup.",
  },
  {
    q: "Can we still use spreadsheets too?",
    a: "Yes. Some clinics use Jane for core metrics and supplement with spreadsheet uploads for operational data Jane doesn't track. Both work together.",
  },
  {
    q: "How is this different from Jane reports?",
    a: "Jane reports show you data. ClinicLeader turns that data into a leadership system—scorecards, issue tracking, improvement measurement, meeting agendas. It's not a replacement for Jane; it's a layer that helps you act on what Jane shows.",
  },
];

const JaneIntegrationPublic = () => {
  return (
    <>
      <Helmet>
        <title>ClinicLeader + Jane Integration | Operational Scorecards from Jane Data</title>
        <meta
          name="description"
          content="Connect Jane to ClinicLeader for automatic performance scorecards, issue tracking, and measurable improvement. Turn Jane operational data into leadership clarity."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <NavPublic />

        <main className="flex-1">
          {/* SECTION 1: Hero */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">ClinicLeader + Jane</h1>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Featured Integration
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mb-8">
                  Turn your Jane operational data into scorecards, issues, meeting focus, and measurable 
                  improvements — without changing how your clinic runs day to day.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      Apply for the Jane Pilot
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 group" asChild>
                    <Link to="/auth">
                      <Play className="mr-2 w-5 h-5" />
                      Book a Walkthrough
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* SECTION 2: What the Jane Integration Means */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Cloud className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">How It Works</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">What the Jane Integration Means</h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                  ClinicLeader connects to Jane to pull operational performance signals—visits, revenue trends, 
                  utilization, scheduling patterns. This data powers your weekly scorecards and trend visibility, 
                  giving your leadership team a clear picture of what's happening across providers and locations. 
                  You don't need to rebuild workflows inside Jane. ClinicLeader sits alongside your existing 
                  operations and uses this data to support leadership decisions and weekly meetings.
                </p>
              </motion.div>
            </div>
          </section>

          {/* SECTION 3: What You Can See */}
          <section className="py-20 md:py-28">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What You Can See</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Jane integration provides operational signals your leadership team needs — where available in your Jane setup.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8">
                {whatYouCanSee.map((category, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-card rounded-2xl border border-border/50"
                  >
                    <h3 className="font-semibold text-lg mb-4 text-primary">{category.category}</h3>
                    <ul className="space-y-3">
                      {category.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 4: What You Can Do With It */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">The Leadership Loop</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What You Can Do With It</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Jane data feeds a complete leadership system — from visibility to action to learning.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {loopBlocks.map((block, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <block.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">{block.phase}</span>
                        <h3 className="font-semibold">{block.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{block.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5: Pilot Expectations */}
          <section className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Jane Pilot Program</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What to Expect</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We're building this with clinics, not just for them.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {pilotExpectations.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{item.title}</div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 6: Data & Privacy */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Data, Your Control</h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {privacyPoints.map((point, i) => (
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
                      <div className="font-semibold mb-1">{point.title}</div>
                      <p className="text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 7: FAQ */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">FAQs</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Jane Integration Questions</h2>
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

          {/* SECTION 8: Final CTA */}
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
                <TrendingUp className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Ready to see what's happening{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                    beneath the surface?
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join the Jane pilot and build a weekly leadership system around real signals.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="text-lg px-10 py-7 shadow-xl shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      Apply for the Jane Pilot
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
                  Limited pilot spots • Close onboarding support • Your feedback shapes the product
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
