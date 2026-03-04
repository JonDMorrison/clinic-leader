import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Target, UserCheck, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { TypewriterRotate } from "@/components/TypewriterRotate";
import { ExecutionLoopVisual } from "@/components/landing/ExecutionLoopVisual";

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
        <div className="grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-12 items-center">
          {/* Left column - Text */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              <span className="whitespace-nowrap">Turn your clinic data into</span>{" "}
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
                <a href="#contact">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
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
            <ExecutionLoopVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
