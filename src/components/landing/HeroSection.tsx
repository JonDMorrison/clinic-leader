import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2, Sparkles, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Floating gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-accent/20 to-success/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-warning/10 to-primary/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-[15%] w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <TrendingUp className="w-6 h-6 text-primary" />
        </motion.div>
        <motion.div
          className="absolute bottom-32 left-[10%] w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        >
          <Sparkles className="w-5 h-5 text-accent" />
        </motion.div>
        <motion.div
          className="absolute top-40 left-[20%] w-8 h-8 bg-success/10 rounded-full flex items-center justify-center"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        >
          <CheckCircle2 className="w-4 h-4 text-success" />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Text content */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">EOS-Aligned Operating System</span>
            </motion.div>

            {/* Headline with gradient */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Lead your clinic.{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                Not just manage it.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              ClinicLeader gives clinic leaders the structure to align their teams, 
              make better decisions, and deliver more consistent patient care.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 group" asChild>
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 group" asChild>
                <Link to="/auth">
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">50+ clinics</span>
                <span className="text-muted-foreground"> trust ClinicLeader</span>
              </div>
            </div>
          </motion.div>

          {/* Right column - Product mockup */}
          <motion.div
            className="relative lg:pl-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Browser frame mockup */}
            <div className="relative">
              {/* Glow effect behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-2xl blur-2xl scale-105" />
              
              {/* Browser window */}
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

                {/* Dashboard mockup content */}
                <div className="p-6 bg-gradient-to-br from-background to-muted/30 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Rocks On Track", value: "8/10", color: "text-success" },
                      { label: "Issues Solved", value: "24", color: "text-primary" },
                      { label: "Team Score", value: "92%", color: "text-accent" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-card/80 rounded-lg p-3 border border-border/30">
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-card/80 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Weekly Scorecard</span>
                      <span className="text-xs text-success">↑ 12%</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 65, 45, 70, 55, 80, 75, 90, 85, 95, 88, 92].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rocks list */}
                  <div className="bg-card/80 rounded-lg p-4 border border-border/30 space-y-2">
                    <div className="text-sm font-medium mb-2">Q1 Rocks</div>
                    {[
                      { title: "Reduce no-show rate to 8%", status: "on-track" },
                      { title: "Launch patient feedback system", status: "at-risk" },
                      { title: "Hire 2 new therapists", status: "on-track" },
                    ].map((rock, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{rock.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rock.status === "on-track" 
                            ? "bg-success/10 text-success" 
                            : "bg-warning/10 text-warning"
                        }`}>
                          {rock.status === "on-track" ? "On Track" : "At Risk"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <motion.div
                className="absolute -right-4 top-20 bg-card rounded-lg shadow-xl border border-border/50 p-3 max-w-[180px]"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Issue Resolved</div>
                    <div className="text-[10px] text-muted-foreground">Front desk handoff process</div>
                  </div>
                </div>
              </motion.div>

              {/* Floating users card */}
              <motion.div
                className="absolute -left-4 bottom-20 bg-card rounded-lg shadow-xl border border-border/50 p-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Team Aligned</div>
                    <div className="text-[10px] text-muted-foreground">12 members active</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
