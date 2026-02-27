import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, UserMinus, DollarSign } from "lucide-react";

const examples = [
  {
    icon: DollarSign,
    insight: "$4,200 lost to cancellations last week",
    context: "Across 3 providers, 18 cancelled appointments weren't re-filled.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: TrendingDown,
    insight: "Provider utilization dropped to 68%",
    context: "Two providers have consistent afternoon gaps. The schedule looks full but isn't.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: UserMinus,
    insight: "New patient numbers trending down 3 weeks in a row",
    context: "Referrals are steady, but conversion from inquiry to booked is slipping.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: AlertTriangle,
    insight: "Monday cancellation rate is 2× the weekly average",
    context: "Weekend reminder gaps may be the cause. Worth testing a Friday outreach.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

export const RealExamples = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            The kind of things{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              you'll see
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ClinicLeader surfaces these automatically from your clinic data.
            No manual reports. No digging through spreadsheets.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {examples.map((example, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card/80 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${example.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <example.icon className={`w-5 h-5 ${example.color}`} />
                </div>
                <div>
                  <p className={`text-lg font-semibold ${example.color}`}>{example.insight}</p>
                  <p className="text-sm text-muted-foreground mt-1">{example.context}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
