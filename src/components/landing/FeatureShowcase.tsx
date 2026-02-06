import { motion } from "framer-motion";
import { FileText, BarChart3, AlertCircle, Target, Users, Zap, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Standards your team can access",
    description: "Your SOPs live in one place, searchable and connected to performance. When questions arise, answers are instant - without repeating yourself.",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: BarChart3,
    title: "Scorecards that surface what matters",
    description: "See weekly performance by provider, discipline, or location. Know what's on track and what needs attention before your meeting starts.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: AlertCircle,
    title: "Issues that lead to decisions",
    description: "Problems get identified, discussed, and resolved. Every issue has an owner, a path to resolution, and a clear outcome.",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    icon: Target,
    title: "Priorities that stay visible",
    description: "Quarterly goals stay connected to weekly execution. Progress is tracked. Accountability is clear. Your team knows what matters most.",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    icon: Users,
    title: "Meetings driven by data",
    description: "Stop relying on opinions and memory. The system prepares your agenda, highlights concerns, and keeps focus on decisions.",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-500/10",
    iconColor: "text-pink-500",
  },
  {
    icon: Zap,
    title: "Recommendations built on real results",
    description: "See patterns across your own clinic and anonymized insights from similar practices. Understand what improvement changes tend to work - and why.",
    color: "from-primary to-accent",
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const FeatureShowcase = () => {
  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">See → Prioritize → Act → Learn</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            A complete system for{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              leadership clarity
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From scorecards to improvement tracking, ClinicLeader connects performance signals to action - and measures what happens next.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-bl-[80px] rounded-tr-2xl transition-opacity duration-300`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom highlight */}
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
              Your data stays yours • Cross-clinic learning is anonymized • HIPAA-aligned security
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
