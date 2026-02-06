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
  BarChart3,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  FileText,
  Database,
  Shield,
  Calendar,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";
import scorecardReviewImage from "@/assets/marketing/scorecard-review.jpg";
import teamMeetingImage from "@/assets/marketing/team-meeting.jpg";
import workflowReviewImage from "@/assets/marketing/workflow-review.jpg";

const loopSteps = [
  {
    id: "see",
    label: "SEE",
    icon: Eye,
    description: "Understand clinic performance clearly.",
    color: "from-primary to-accent",
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: "prioritize",
    label: "PRIORITIZE",
    icon: Target,
    description: "Identify problems early and focus meetings on decisions.",
    color: "from-success to-accent",
    bgColor: "bg-success/10",
    iconColor: "text-success",
  },
  {
    id: "act",
    label: "ACT",
    icon: Zap,
    description: "Track improvement changes intentionally.",
    color: "from-primary to-accent",
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: "learn",
    label: "LEARN",
    icon: BookOpen,
    description: "Measure results and build playbooks that scale.",
    color: "from-accent to-primary",
    bgColor: "bg-accent/10",
    iconColor: "text-accent",
  },
];

const weeklyTimeline = [
  {
    period: "Monday–Tuesday",
    activity: "Scorecard review",
    icon: BarChart3,
  },
  {
    period: "Weekly Meeting",
    activity: "Issue prioritization + improvement decisions",
    icon: Target,
  },
  {
    period: "During Week",
    activity: "Improvement execution + SOP usage",
    icon: Zap,
  },
  {
    period: "End of Cycle",
    activity: "Outcome measurement + recommendations",
    icon: Lightbulb,
  },
];

const Features = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Helmet>
        <title>Features - ClinicLeader | Clinic Performance Software</title>
        <meta
          name="description"
          content="Explore ClinicLeader's clinic performance software features: scorecards, issue detection, improvement tracking, and outcome intelligence for healthcare leadership."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <NavPublic />

        <main className="flex-1">
          {/* SECTION 1: Hero Intro */}
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Everything you need to run your clinic{" "}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    with clarity
                  </span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  ClinicLeader connects your performance data, leadership meetings, 
                  improvement tracking, and organizational learning into one system.
                </p>

                <p className="text-lg text-muted-foreground">
                  Works with Jane, other EMRs, spreadsheets, or manual tracking.
                </p>

                {/* Loop visual representation */}
                <div className="flex items-center justify-center gap-2 md:gap-4 py-6 flex-wrap">
                  {loopSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 md:gap-4">
                      <button
                        onClick={() => scrollToSection(step.id)}
                        className={`px-4 py-2 rounded-full ${step.bgColor} ${step.iconColor} font-semibold text-sm hover:scale-105 transition-transform`}
                      >
                        {step.label}
                      </button>
                      {index < loopSteps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                      )}
                    </div>
                  ))}
                </div>

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

          {/* SECTION 2: Leadership Loop Overview */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  The Leadership Loop
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  A complete system that connects performance visibility to measurable improvement.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loopSteps.map((step, index) => (
                  <motion.button
                    key={step.id}
                    onClick={() => scrollToSection(step.id)}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg text-left"
                  >
                    <div className={`w-14 h-14 rounded-xl ${step.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                      {step.label}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                    <ArrowDown className="w-4 h-4 text-muted-foreground absolute bottom-4 right-4 group-hover:translate-y-1 transition-transform" />
                  </motion.button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: SEE - Performance Scorecards */}
          <section id="see" className="py-20 md:py-28 scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">SEE</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Performance Scorecards
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    See weekly performance by provider, discipline, or location. 
                    Scorecards surface what matters so your leadership team operates from the same numbers.
                  </p>

                  <ul className="space-y-3">
                    {[
                      "Know what is on track before meetings start",
                      "Spot utilization and retention shifts early",
                      "Align leadership around the same numbers",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  {/* Documentary image */}
                  <div className="relative">
                    <img
                      src={scorecardReviewImage}
                      alt="Clinic operations manager reviewing weekly performance scorecards"
                      className="rounded-2xl shadow-lg border border-border/30 w-full"
                      loading="lazy"
                    />
                  </div>

                  <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Weekly Scorecard</span>
                        <span className="text-sm text-muted-foreground">Feb 2026</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Visits", value: "847", trend: "+12%" },
                          { label: "Utilization", value: "78%", trend: "+3%" },
                          { label: "Retention", value: "91%", trend: "-1%" },
                        ].map((stat, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold">{stat.value}</div>
                            <div className="text-xs text-muted-foreground">{stat.label}</div>
                            <div className={`text-xs ${stat.trend.startsWith('+') ? 'text-success' : 'text-warning'}`}>
                              {stat.trend}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-end gap-1 h-20">
                        {[40, 55, 48, 62, 58, 72, 68, 75, 70, 82, 78, 85].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 4: PRIORITIZE - Issue Detection */}
          <section id="prioritize" className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6 lg:order-1"
                >
                  {/* Documentary image */}
                  <div className="relative">
                    <img
                      src={teamMeetingImage}
                      alt="Healthcare leadership team conducting structured weekly meeting"
                      className="rounded-2xl shadow-lg border border-border/30 w-full"
                      loading="lazy"
                    />
                  </div>

                  <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Meeting Agenda</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">Auto-prepared</span>
                      </div>
                      {[
                        { title: "Utilization drop - Provider A", priority: "High", status: "Discuss" },
                        { title: "New patient conversion rate", priority: "Medium", status: "Decide" },
                        { title: "Q1 improvement progress", priority: "Low", status: "Update" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertCircle className={`w-4 h-4 ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                            <span className="text-sm">{item.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.priority === 'High' ? 'bg-warning/10 text-warning' :
                            item.priority === 'Medium' ? 'bg-primary/10 text-primary' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6 lg:order-2"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                    <Target className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium text-success">PRIORITIZE</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Issue Detection & Meeting Intelligence
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Issues are surfaced from performance signals and automatically prepared for your meetings. 
                    Your agenda is built from real operational priorities, not memory.
                  </p>

                  <ul className="space-y-3">
                    {[
                      "Meetings focus on decisions instead of updates",
                      "Problems are tracked until resolved",
                      "Leadership alignment improves",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-4 italic">
                    Issues connect directly to improvement tracking — when you solve a problem, 
                    track the change that fixed it.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 5: ACT - Improvement Tracking */}
          <section id="act" className="py-20 md:py-28 scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">ACT</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Improvement Tracking
                  </h2>

                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                    <p className="text-muted-foreground italic">
                      "Interventions are intentional changes your clinic makes to improve performance — 
                      and ClinicLeader tracks whether those changes work."
                    </p>
                  </div>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Link improvement efforts to performance metrics. Assign ownership, 
                    capture baseline performance, and track execution through your weekly meetings.
                  </p>

                  <ul className="space-y-3">
                    {[
                      "You know what changes your clinic has tried",
                      "You stop repeating failed improvement efforts",
                      "Leadership actions become measurable",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6"
                >
                  {/* Documentary image */}
                  <div className="relative">
                    <img
                      src={workflowReviewImage}
                      alt="Healthcare administrator reviewing workflow checklist and operational progress"
                      className="rounded-2xl shadow-lg border border-border/30 w-full"
                      loading="lazy"
                    />
                  </div>

                  <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Active Improvements</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">3 running</span>
                      </div>
                      {[
                        { name: "Same-day booking pilot", metric: "Utilization", baseline: "72%", current: "78%", status: "Improving" },
                        { name: "Follow-up reminder calls", metric: "Retention", baseline: "89%", current: "91%", status: "Improving" },
                        { name: "New patient welcome flow", metric: "Conversion", baseline: "34%", current: "32%", status: "Monitoring" },
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.status === 'Improving' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Target: {item.metric}</span>
                            <span>Baseline: {item.baseline}</span>
                            <span className={item.current > item.baseline ? 'text-success' : 'text-warning'}>
                              Now: {item.current}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 6: LEARN - Outcomes + Recommendations */}
          <section id="learn" className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="bg-card rounded-2xl border border-border/50 p-6 shadow-lg lg:order-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Recommendations</span>
                      <span className="text-xs text-muted-foreground">Based on your data</span>
                    </div>
                    {[
                      { title: "Consider same-day booking for new patients", confidence: "Strong", reason: "Worked in 3 similar clinics" },
                      { title: "Review Provider B utilization patterns", confidence: "Moderate", reason: "Emerging pattern detected" },
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.confidence === 'Strong' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                          }`}>
                            {item.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/20">
                      <Lightbulb className="w-4 h-4 text-accent" />
                      <span className="text-xs text-muted-foreground">
                        2 improvement patterns added to your playbook this quarter
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-6 lg:order-2"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-accent">LEARN</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold">
                    Outcome Intelligence & Recommendations
                  </h2>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Automatic measurement of improvement results. Confidence-based recommendations 
                    help you understand what works — with optional anonymized cross-clinic benchmarking.
                  </p>

                  <ul className="space-y-3">
                    {[
                      "Your clinic builds an internal improvement playbook",
                      "Leadership decisions improve over time",
                      "Recommendations remain transparent and explainable",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </section>

          {/* SECTION 7: SOPs & Playbooks */}
          <section className="py-20 md:py-28 scroll-mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Knowledge Management</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  SOPs and Improvement Playbooks
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  SOPs connected to real performance outcomes. Playbooks generated from successful interventions. 
                  Knowledge retained as your team grows.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Consistent Standards",
                    description: "Standards remain consistent across providers and locations",
                    icon: CheckCircle2,
                  },
                  {
                    title: "Faster Training",
                    description: "New team members onboard with proven processes",
                    icon: TrendingUp,
                  },
                  {
                    title: "Preserved Knowledge",
                    description: "Operational knowledge is preserved even as team changes",
                    icon: BookOpen,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 8: Data Connections */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Flexible Integration</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Flexible Data Integration
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                  ClinicLeader connects to your existing systems without disrupting workflows.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: "Jane App", desc: "Native integration" },
                  { name: "Other EMRs", desc: "Bulk data import" },
                  { name: "Excel / Spreadsheets", desc: "Upload directly" },
                  { name: "Manual Tracking", desc: "Enter operational data" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-card rounded-xl border border-border/50 text-center hover:border-primary/30 transition-colors"
                  >
                    <div className="font-semibold mb-1">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-center text-muted-foreground mt-8"
              >
                No disruption to existing workflows.
              </motion.p>
            </div>
          </section>

          {/* SECTION 9: AI Insight Safety */}
          <section className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Responsible AI</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Responsible AI Insights
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Pattern Highlighting", desc: "AI highlights patterns and summarizes outcomes from your data" },
                  { title: "Human Decisions", desc: "Leaders always make final decisions — AI provides context, not commands" },
                  { title: "Reliability Indicators", desc: "Recommendations include confidence levels and evidence quality" },
                  { title: "Data Privacy", desc: "Patient data is never exposed or shared across clinics" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4"
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

          {/* SECTION 10: Security & Trust */}
          <section className="py-20 md:py-28 bg-gradient-to-b from-muted/30 to-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Security & Trust</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your Data. Your Control.
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Clinics own their data",
                  "Cross-clinic learning is anonymized",
                  "Multi-tenant security architecture",
                  "Healthcare-grade encryption standards",
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
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

          {/* SECTION 11: Weekly Usage Timeline */}
          <section className="py-20 md:py-28">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Weekly Rhythm</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  How Clinics Use ClinicLeader Weekly
                </h2>
              </motion.div>

              <div className="space-y-4">
                {weeklyTimeline.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.period}</div>
                      <div className="text-sm text-muted-foreground">{item.activity}</div>
                    </div>
                    {i < weeklyTimeline.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 12: Final CTA */}
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
                  Ready to run your clinic{" "}
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                    with clarity?
                  </span>
                </h2>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Join clinics building measurable leadership systems.
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

export default Features;
