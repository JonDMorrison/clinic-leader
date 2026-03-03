import { motion } from "framer-motion";
import { PlugZap, BarChart3, Users, Repeat } from "lucide-react";

const steps = [
  {
    icon: PlugZap,
    number: "1",
    title: "Connect your clinic data",
    description: "Link your EMR, upload a spreadsheet, or enter numbers manually. Setup takes minutes.",
  },
  {
    icon: BarChart3,
    number: "2",
    title: "Review your scorecard every week",
    description: "Your KPIs update automatically. Off-track numbers get flagged as issues. No digging required.",
  },
  {
    icon: Users,
    number: "3",
    title: "Run a structured leadership meeting",
    description: "Follow the L10 format. Discuss issues. Make decisions. Assign owners and deadlines before you leave the room.",
  },
  {
    icon: Repeat,
    number: "4",
    title: "Track whether your changes worked",
    description: "Log interventions. Compare against baseline. Next week, you'll know if the number moved or if you need to try something else.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            A weekly rhythm your team{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              actually follows
            </span>
          </h2>
        </motion.div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-start gap-6 p-6 rounded-2xl bg-card/80 border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">{step.number}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
