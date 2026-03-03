import { motion } from "framer-motion";
import { ClipboardList, MessageSquareWarning, Repeat, Shield } from "lucide-react";

const outcomes = [
  {
    icon: ClipboardList,
    title: "Weekly scorecard with teeth",
    description:
      "Your KPIs update every week. When a number goes off-track, ClinicLeader flags it as an issue automatically. No more hoping someone notices.",
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: MessageSquareWarning,
    title: "Structured meetings, real decisions",
    description:
      "Run your L10 with a built-in agenda. Every issue gets discussed, decided, and assigned. Meetings end with owners and deadlines, not open loops.",
    bgColor: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    icon: Repeat,
    title: "Interventions you can actually measure",
    description:
      "Made a change? ClinicLeader tracks the intervention against baseline metrics. You'll know if it worked, or if it didn't, so you can adjust.",
    bgColor: "bg-success/10",
    iconColor: "text-success",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const FeatureShowcase = () => {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Numbers to decisions to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              results
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Not a reporting tool. A weekly operating rhythm that connects what you measure to what you do about it.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {outcomes.map((item, index) => (
            <motion.div key={index} variants={itemVariants} className="group">
              <div className="relative h-full p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 text-center">
                <div
                  className={`w-16 h-16 rounded-2xl ${item.bgColor} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}
                >
                  <item.icon className={`w-8 h-8 ${item.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Your data stays yours · Connects to Jane, other EMRs, or spreadsheets
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
