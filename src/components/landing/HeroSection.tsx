import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Eye, Calendar, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import heroLeadershipImage from "@/assets/marketing/hero-leadership-meeting.jpg";

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
              Your clinic has the data.{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                Now turn it into progress.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Cancellations, no-shows, revenue gaps, provider schedules. The information
              is there. ClinicLeader helps you see it clearly, decide what to do, and
              follow through every week.
            </p>

            {/* Bullet points */}
            <ul className="space-y-3 text-foreground">
              {[
                { icon: Eye, text: "See cancellations, utilization, and revenue gaps as they happen" },
                { icon: TrendingUp, text: "Track weekly performance so you know if things are actually improving" },
                { icon: Users, text: "Align your team around what matters most this week" },
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
                  See how it works
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
                src={heroLeadershipImage}
                alt="Clinic leadership team reviewing weekly performance"
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

                {/* Dashboard content */}
                <div className="p-6 bg-gradient-to-br from-background to-muted/30 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Cancellations", value: "$4.2K lost", color: "text-destructive" },
                      { label: "Utilization", value: "68%", color: "text-warning" },
                      { label: "New Patients", value: "↓ 12%", color: "text-primary" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-card/80 rounded-lg p-3 border border-border/30">
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card/80 rounded-lg p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Weekly Revenue</span>
                      <span className="text-xs text-success">↑ 5%</span>
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
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
