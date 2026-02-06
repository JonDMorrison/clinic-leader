import { motion } from "framer-motion";
import { Building2, Zap, Scale, BarChart3, Heart } from "lucide-react";

const differentiators = [
  {
    icon: Building2,
    title: "Designed for clinic operations",
    description: "Not adapted from project management software. Every feature exists because clinic owners and operators asked for it.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Scale,
    title: "Structured without bureaucracy",
    description: "Clear frameworks for scorecards, meetings, and improvement tracking - without requiring consultants or certifications.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Connects data to decisions",
    description: "See performance signals, surface issues, track improvement changes, and measure outcomes. A complete loop, not a disconnected dashboard.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Weekly rhythm, not occasional reports",
    description: "This is an operating system your leadership team uses every week - not a reporting tool you check when something feels wrong.",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Heart,
    title: "Reduces what you carry alone",
    description: "Move context out of your head and into a system your team can access. When the structure holds, you can focus on leading.",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
];

export const WhyDifferent = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Why clinics outgrow{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              spreadsheets and dashboards
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Most tools show you data. ClinicLeader helps you see clearly, prioritize issues, act intentionally, and learn from results.
          </p>
        </motion.div>

        {/* Differentiators grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group ${index === 4 ? 'lg:col-start-2' : ''}`}
            >
              <div className="relative h-full p-6 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>

                {/* Hover indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
