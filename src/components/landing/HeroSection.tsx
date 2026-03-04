import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Target, UserCheck, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import heroClinicIllustration from "@/assets/marketing/hero-clinic-illustration.png";
import { TypewriterRotate } from "@/components/TypewriterRotate";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

      {/* Floating gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-accent/20 to-success/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Text */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Turn your clinic data into{" "}
              <TypewriterRotate
                phrases={[
                  "excellent decisions",
                  "clear ownership",
                  "measurable results",
                  "team buy-in",
                  "clinic growth",
                ]}
                className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift"
              />
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Every week, your scorecard flags what's off track. Your team discusses it in a structured meeting. Someone owns the fix. And next week, you measure whether it worked.
            </p>

            {/* Bullet points */}
            <ul className="space-y-3 text-foreground">
              {[
                { icon: Target, text: "Off-track metrics become flagged issues. No more hoping someone notices." },
                { icon: UserCheck, text: "Every issue gets an owner and a deadline before the meeting ends." },
                { icon: BarChart3, text: "Every decision is tracked against baseline. You'll know if it worked." },
              ].map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span>{item.text}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 group" asChild>
                <Link to="/auth">
                  Become a tester
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 group" asChild>
                <Link to="/auth">
                  <Play className="mr-2 w-5 h-5" />
                  Book a walkthrough
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right column - Image + mockup */}
          <motion.div
            className="relative lg:pl-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-2xl blur-xl scale-105" />
              <img
                src={heroClinicIllustration}
                alt="Illustration of clinic leadership team reviewing data dashboards"
                className="relative rounded-2xl shadow-xl border border-border/30 w-full max-w-[520px] mx-auto"
                loading="eager"
              />
            </div>

            {/* Dashboard preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-2xl blur-2xl scale-105" />
              <div className="relative bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-background/80 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                      app.clinicleader.com
                    </div>
                  </div>
                </div>

                {/* Dashboard content - Clinic Pulse style */}
                <div className="p-5 bg-gradient-to-br from-background to-muted/30 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-sm font-semibold">Clinic Pulse</span>
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">Week of Feb 24</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Revenue", value: "$18.4K", badge: "positive", badgeColor: "bg-success/15 text-success", trend: "+$1.2K", trendColor: "text-success" },
                      { label: "No-Shows", value: "4.2%", badge: "info", badgeColor: "bg-muted text-muted-foreground", trend: "−0.8%", trendColor: "text-success" },
                      { label: "New Patients", value: "12", badge: "positive", badgeColor: "bg-success/15 text-success", trend: "+3", trendColor: "text-success" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-card/80 rounded-lg p-2.5 border border-border/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground truncate">{stat.label}</span>
                          <span className={`text-[8px] px-1.5 py-0 rounded-full border ${stat.badgeColor}`}>{stat.badge}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold tabular-nums">{stat.value}</span>
                          <span className={`text-[10px] font-medium ${stat.trendColor}`}>{stat.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Utilization", value: "82%", badge: "warning", badgeColor: "bg-warning/15 text-warning" },
                      { label: "Collections", value: "94%", badge: "positive", badgeColor: "bg-success/15 text-success" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-card/80 rounded-lg p-2.5 border border-border/30">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                          <span className={`text-[8px] px-1.5 py-0 rounded-full border ${stat.badgeColor}`}>{stat.badge}</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
