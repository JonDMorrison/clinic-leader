import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import {
  ArrowRight,
  Play,
  Cloud,
  FileSpreadsheet,
  Database,
  Shield,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Star,
  Link as LinkIcon,
  BarChart3,
  Zap,
} from "lucide-react";

const integrationCards = [
  {
    id: "jane",
    title: "Jane App",
    description: "Automatic scorecards and operational insights from your Jane data.",
    icon: Cloud,
    featured: true,
    path: "/integrations/jane",
    cta: "View Jane Integration",
  },
  {
    id: "spreadsheets",
    title: "Spreadsheet Upload",
    description: "Upload existing KPI sheets to build scorecards and trends fast.",
    icon: FileSpreadsheet,
    featured: false,
    path: "/integrations/spreadsheets",
    cta: "Learn More",
  },
  {
    id: "emr",
    title: "Other EMRs",
    description: "We can map your operational metrics into ClinicLeader's scorecard system.",
    icon: Database,
    featured: false,
    path: "/integrations/emr",
    cta: "Learn More",
  },
];

const trustPoints = [
  {
    title: "Operational Metrics Only",
    description: "ClinicLeader focuses on performance data: visits, revenue, utilization, retention, and scheduling signals.",
  },
  {
    title: "No Clinical Details Required",
    description: "ClinicLeader does NOT need patient notes or clinical details to work.",
  },
  {
    title: "You Control Access",
    description: "Clinics control what is connected and who can access it.",
  },
  {
    title: "Anonymized Cross-Clinic Learning",
    description: "Cross-clinic insights (if enabled) are anonymized and aggregated—never identifiable.",
  },
];

const setupSteps = [
  {
    step: 1,
    title: "Connect your source",
    description: "Jane / Upload / EMR mapping",
    icon: LinkIcon,
  },
  {
    step: 2,
    title: "Choose your scorecard metrics",
    description: "Select which metrics matter for your clinic",
    icon: BarChart3,
  },
  {
    step: 3,
    title: "Start your weekly leadership loop",
    description: "See → Prioritize → Act → Learn",
    icon: Zap,
  },
];

const faqs = [
  {
    q: "Do I need Jane to use ClinicLeader?",
    a: "No. Jane is a featured integration, but you can also use spreadsheet uploads or connect other EMR systems. ClinicLeader is designed to work with whatever data source fits your clinic.",
  },
  {
    q: "Can I start with spreadsheets?",
    a: "Yes. Many clinics begin by uploading existing KPI spreadsheets. This is a fast way to build scorecards and start tracking trends before adding automated integrations.",
  },
  {
    q: "What if my EMR isn't listed?",
    a: "We can work with you to map your operational metrics into ClinicLeader's scorecard system. Contact us to discuss your specific EMR and data format.",
  },
  {
    q: "Does ClinicLeader store patient data?",
    a: "ClinicLeader focuses on operational metrics, not patient clinical data. We do not store patient names, notes, or clinical details. Our system is designed for leadership visibility, not patient records.",
  },
  {
    q: "How long does setup take?",
    a: "Most clinics are up and running within two weeks. Jane integration takes about 15 minutes to configure. Spreadsheet uploads can start immediately. Custom EMR mappings may take longer depending on your data format.",
  },
];

const IntegrationsPublic = () => {
  return (
    <>
      <Helmet>
        <title>Integrations - ClinicLeader | Connect Your Clinic Data</title>
        <meta
          name="description"
          content="Connect ClinicLeader to Jane App, spreadsheets, or your EMR. Turn clinic performance data into scorecards, issues, and measurable improvements."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <NavPublic />

        <main className="flex-1">
          {/* SECTION 1: Hero */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                className="text-center space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Data Connections</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Integrations that fit how{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    clinics operate
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Connect ClinicLeader to Jane, spreadsheets, or your EMR to turn performance data 
                  into scorecards, issues, and measurable improvements.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 group" asChild>
                    <Link to="/auth">
                      Apply for Pilot Access
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

          {/* SECTION 2: Integration Cards Grid */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Choose Your Data Source
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Start with the integration that fits your clinic. You can always add more later.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {integrationCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`group relative p-6 bg-card rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                      card.featured 
                        ? 'border-primary/30 hover:border-primary/50 ring-1 ring-primary/10' 
                        : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    {card.featured && (
                      <div className="absolute -top-3 left-6">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      </div>
                    )}

                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
                      card.featured ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <card.icon className={`w-7 h-7 ${card.featured ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>

                    <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                    <p className="text-muted-foreground text-sm mb-6">{card.description}</p>

                    <Button 
                      variant={card.featured ? "default" : "outline"} 
                      className="w-full group/btn" 
                      asChild
                    >
                      <Link to={card.path}>
                        {card.cta}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: What Data is Used (Trust Block) */}
          <section className="py-20 md:py-28">
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  What Data is Used
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  ClinicLeader is designed for operational visibility, not patient records.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {trustPoints.map((point, i) => (
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

          {/* SECTION 4: How Setup Works */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  How Setup Works
                </h2>
                <p className="text-lg text-muted-foreground">
                  Three steps to leadership clarity.
                </p>
              </motion.div>

              <div className="space-y-4">
                {setupSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-primary">{step.step}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{step.title}</div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    <step.icon className="w-5 h-5 text-muted-foreground hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 5: FAQ */}
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
                <h2 className="text-3xl md:text-4xl font-bold">
                  Integration Questions
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

          {/* SECTION 6: Final CTA */}
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
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Bring your data.{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                    We'll bring the clarity.
                  </span>
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
                  Pilot collaboration • Your data stays private • HIPAA-aligned security
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

export default IntegrationsPublic;
