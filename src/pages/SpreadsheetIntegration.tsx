import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import {
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  BarChart3,
  Clock,
  Zap,
  Play,
} from "lucide-react";

const benefits = [
  {
    title: "Start immediately",
    description: "No EMR integration required. Upload your existing KPI tracking sheets and see your first scorecard today.",
  },
  {
    title: "Use what you already have",
    description: "If you're tracking metrics in Excel or Google Sheets, that data works here. No reformatting needed.",
  },
  {
    title: "Build your weekly rhythm",
    description: "Start running structured leadership meetings around real numbers — even before automating data collection.",
  },
  {
    title: "Transition when ready",
    description: "Many clinics start with spreadsheets and add EMR integrations later. Both work together.",
  },
];

const howItWorks = [
  {
    icon: Upload,
    title: "Upload your file",
    description: "Excel (.xlsx) or CSV format. We'll help map your columns to scorecard metrics.",
  },
  {
    icon: BarChart3,
    title: "Review your scorecard",
    description: "See your metrics organized with trends and status indicators.",
  },
  {
    icon: Zap,
    title: "Start your leadership loop",
    description: "Use your scorecard to prioritize issues, track improvements, and run better meetings.",
  },
];

const SpreadsheetIntegration = () => {
  return (
    <>
      <Helmet>
        <title>Spreadsheet Upload - ClinicLeader | Import Your Clinic KPIs</title>
        <meta
          name="description"
          content="Upload your existing clinic KPI spreadsheets to ClinicLeader. Build scorecards and start your weekly leadership loop without waiting on EMR integration."
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
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold">Spreadsheet Upload</h1>
                    <p className="text-muted-foreground">Turn your existing KPIs into scorecards</p>
                  </div>
                </div>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  Already tracking clinic metrics in Excel or Google Sheets? Upload your existing data 
                  to build scorecards and start your weekly leadership loop — no EMR integration required.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
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

          {/* How It Works */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-lg text-muted-foreground">
                  Three steps to your first scorecard.
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

          {/* Supported Formats */}
          <section className="py-16 md:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center p-8 bg-card rounded-2xl border border-border/50"
              >
                <FileSpreadsheet className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Supported Formats</h3>
                <p className="text-muted-foreground">
                  Excel (.xlsx, .xls) and CSV files. Export from Google Sheets works too.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Start with Spreadsheets</h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {benefits.map((item, i) => (
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
                      <p className="text-sm text-muted-foreground">{item.description}</p>
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
                <Clock className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl md:text-4xl font-bold">
                  Ready to turn your spreadsheets into scorecards?
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Start your weekly leadership loop today — no EMR integration required.
                </p>
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
              </motion.div>
            </div>
          </section>
        </main>

        <FooterPublic />
      </div>
    </>
  );
};

export default SpreadsheetIntegration;
