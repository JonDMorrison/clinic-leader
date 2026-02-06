import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NavPublic } from "@/components/layout/NavPublic";
import { FooterPublic } from "@/components/layout/FooterPublic";
import {
  ArrowRight,
  Play,
  Eye,
  Target,
  Zap,
  BookOpen,
  Heart,
  Users,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const leadershipLoop = [
  {
    icon: Eye,
    label: "SEE",
    title: "Performance scorecards that surface meaningful signals early",
    outcome: "Know what's happening before small issues become big problems.",
  },
  {
    icon: Target,
    label: "PRIORITIZE",
    title: "Issues and meetings focused on the right problems",
    outcome: "Spend leadership time on what actually moves the needle.",
  },
  {
    icon: Zap,
    label: "ACT",
    title: "Improvement tracking that connects changes to performance",
    outcome: "See whether intentional improvement changes are working.",
  },
  {
    icon: BookOpen,
    label: "LEARN",
    title: "Outcome measurement and internal playbook building",
    outcome: "Build organizational memory of what works for your clinic.",
  },
];

const About = () => {
  return (
    <>
      <Helmet>
        <title>About ClinicLeader | Leadership Intelligence for Healthcare Clinics</title>
        <meta
          name="description"
          content="Learn the story behind ClinicLeader, its mission to support clinic leadership clarity, and how it helps healthcare teams build measurable improvement systems."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <NavPublic />

        <main className="flex-1">
          {/* Section 1: Hero Intro */}
          <section className="relative py-24 md:py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            <motion.div
              className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center space-y-6"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Helping clinics run with{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                    clarity
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  ClinicLeader exists to help healthcare leadership teams understand performance, 
                  stay aligned, and learn what operational changes actually improve results.
                </p>

                <p className="text-base text-muted-foreground">
                  Founded by Jon Morrison, co-founder of Clinic Sites (now Jane Websites).
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

          {/* Section 2: Origin Story */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
                  Where ClinicLeader came from
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                  <p>
                    Through years of working alongside clinics at Clinic Sites — which later became 
                    Jane Websites — I had the privilege of listening to clinic owners, administrators, 
                    and leadership teams describe their daily operational challenges.
                  </p>
                  <p>
                    What I observed over and over again was a recurring pattern: clinics had data, 
                    often more than they knew what to do with. But translating that data into clear 
                    leadership decisions remained difficult. Many teams tracked performance diligently, 
                    yet rarely tracked whether the improvement efforts they launched actually worked.
                  </p>
                  <p>
                    The issue wasn't a lack of effort or intelligence. It was a lack of structure 
                    that connected performance visibility to prioritization, action, and measurable 
                    learning over time.
                  </p>
                  <p>
                    ClinicLeader grew out of those conversations. It's an attempt to provide that 
                    missing structure — not to tell clinics what to do, but to help leadership teams 
                    see more clearly, act more intentionally, and learn what actually works.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 3: What ClinicLeader Exists To Do */}
          <section className="py-20 md:py-28">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  What ClinicLeader exists to do
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  A leadership operating loop that connects performance signals to measurable outcomes.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {leadershipLoop.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-card rounded-2xl border border-border/50"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                        {item.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.outcome}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: Why This Matters */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-center">
                  Why this matters
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                  <p>
                    Healthcare leadership is complex. Clinic owners and managers balance patient care, 
                    team wellbeing, and business sustainability — often simultaneously, and often with 
                    limited bandwidth.
                  </p>
                  <p>
                    Many of the tools available to leadership teams focus on either reporting or task 
                    management, but rarely both. Clinics often rely on a combination of disconnected 
                    systems, spreadsheets, and manual tracking that require significant effort to maintain.
                  </p>
                  <p>
                    ClinicLeader is designed to be a structure that supports leadership clarity rather 
                    than adding additional workload. It's about making the work clinics already do — 
                    reviewing performance, discussing priorities, tracking improvement efforts — more 
                    visible, more consistent, and more likely to produce measurable outcomes.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 5: Built With Clinics */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold">
                  Built with clinics
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4 text-left">
                  <p>
                    ClinicLeader's development has been shaped by ongoing conversations with pilot 
                    clinics. The features we build reflect real operational workflows, real leadership 
                    challenges, and real feedback from the people who use the system.
                  </p>
                  <p>
                    We don't claim to have all the answers. What we do have is a commitment to 
                    listening carefully and evolving the platform based on what clinics actually 
                    need — not what we assume they need.
                  </p>
                  <p className="text-center font-medium text-foreground">
                    ClinicLeader is evolving alongside clinics.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 6: Integration Philosophy */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
                  How ClinicLeader fits in
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                  <p>
                    ClinicLeader works alongside your existing systems. It's not a replacement for 
                    your clinical record system, your scheduling platform, or your EMR. It's a 
                    leadership layer that helps you use operational data more effectively.
                  </p>
                  <p>
                    We support integration with Jane App, spreadsheet uploads, and other EMRs. 
                    The goal is to meet clinics where they are — whether that's a fully integrated 
                    EMR connection or a simple weekly data upload.
                  </p>
                  <p>
                    ClinicLeader focuses on operational performance signals: visits, revenue trends, 
                    utilization, and the metrics that matter most to your leadership team. It 
                    doesn't need clinical notes or patient-level detail to do its job.
                  </p>
                </div>

                <div className="flex justify-center pt-4">
                  <Button variant="outline" asChild>
                    <Link to="/integrations">
                      View Integration Options
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 7: Responsible AI & Data Use */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-center">
                  Responsible AI & data use
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
                  <p>
                    ClinicLeader uses AI to highlight patterns, summarize insights, and help 
                    leadership teams notice what might otherwise be missed. But the decisions 
                    remain with your team.
                  </p>
                  <p>
                    AI in ClinicLeader is designed to surface information — not to make 
                    recommendations on your behalf or take autonomous actions. It's a tool to 
                    augment human judgment, not replace it.
                  </p>
                  <p>
                    Your clinic retains ownership of its data. When cross-clinic insights are 
                    enabled, all information is anonymized and aggregated. No identifying details 
                    are shared, and participation is always optional.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 8: About Jon Morrison */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold">
                  About Jon Morrison
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4 text-left">
                  <p>
                    Jon Morrison is the founder of ClinicLeader and co-founder of Clinic Sites, 
                    which later became Jane Websites. Over the years, he's worked with hundreds 
                    of clinics on communication systems, operational clarity, and the infrastructure 
                    that supports leadership decision-making.
                  </p>
                  <p>
                    His approach to building ClinicLeader has been shaped by listening — to clinic 
                    owners, administrators, and leadership teams who have shared their challenges 
                    and aspirations. ClinicLeader reflects what he's learned from those conversations.
                  </p>
                  <p>
                    Jon believes that the best software for clinics is built alongside clinics, 
                    not in isolation. That philosophy guides how ClinicLeader is developed and 
                    how the team engages with pilot partners.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 9: Vision / Future Direction */}
          <section className="py-20 md:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold">
                  Looking ahead
                </h2>

                <div className="prose prose-lg max-w-none text-muted-foreground space-y-4 text-left">
                  <p>
                    We believe clinics can become learning organizations — teams that continuously 
                    improve through measurable operational learning rather than guesswork.
                  </p>
                  <p>
                    Our long-term vision is to support leadership systems that help clinics improve 
                    performance gradually and sustainably. Not through disruptive overhauls, but 
                    through consistent, incremental progress that compounds over time.
                  </p>
                  <p>
                    When leadership teams have clarity about what's working, they can create better 
                    environments for their teams and better experiences for their patients. That's 
                    the outcome we're working toward.
                  </p>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Section 10: Final CTA */}
          <section className="py-24 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
            <motion.div
              className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Building a clinic that values clarity and{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                    measurable improvement?
                  </span>
                </h2>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  We would be honored to show you how ClinicLeader works.
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

export default About;
