import { motion } from "framer-motion";

const moments = [
  {
    feeling: "Reports everywhere, but no clear priorities.",
    detail: "Your EMR has data. Your spreadsheets have data. But when the meeting starts, nobody knows what to focus on first.",
  },
  {
    feeling: "Meetings end without decisions.",
    detail: "You talk about the same issues every week. Nothing gets assigned. Nothing gets tracked. The next meeting feels the same.",
  },
  {
    feeling: "Problems noticed too late.",
    detail: "By the time you see cancellations climbing or utilization dropping, the damage is already done.",
  },
  {
    feeling: "Improvements that don't stick.",
    detail: "You make a change, it works for a week, then nobody follows up. There's no system to track whether things actually got better.",
  },
];

export const TheMoment = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="space-y-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              The data is there.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                The clarity isn't.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most clinics have plenty of information. What's missing is a way to turn it into focus, decisions, and follow-through.
            </p>
          </div>

          <div className="space-y-6">
            {moments.map((moment, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-6 rounded-2xl bg-card/80 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <p className="text-lg font-semibold text-foreground mb-1">"{moment.feeling}"</p>
                <p className="text-muted-foreground">{moment.detail}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center pt-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-lg text-foreground font-medium">
              ClinicLeader connects your data to your decisions, so your team actually moves the numbers every week.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
