import { motion } from "framer-motion";
import { PlugZap, BarChart3, Users } from "lucide-react";

const steps = [
  {
    icon: PlugZap,
    number: "1",
    title: "Connect your clinic data",
    description: "Link your EMR (Jane, others) or upload a spreadsheet. Setup takes minutes, not weeks.",
  },
  {
    icon: BarChart3,
    number: "2",
    title: "See what actually matters",
    description: "Cancellations, utilization, revenue, trends. Updated weekly so you always know where things stand.",
  },
  {
    icon: Users,
    number: "3",
    title: "Run better weekly leadership meetings",
    description: "Your priorities are clear. Your team knows what to focus on. Meetings end with decisions and follow-through.",
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
            Getting started is{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              simple
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
