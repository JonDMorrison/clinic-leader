import { motion } from "framer-motion";

const moments = [
  {
    feeling: "You review the numbers, but nothing changes.",
    detail: "The scorecard says utilization is down. Everyone nods. Nobody owns the fix. Next week, same conversation.",
  },
  {
    feeling: "Meetings feel productive but produce nothing.",
    detail: "You talk about the same issues every week. No one is assigned. No deadline is set. There is no follow-up system.",
  },
  {
    feeling: "You tried something, but can't tell if it worked.",
    detail: "You changed the cancellation policy three weeks ago. Did it move the number? Nobody tracked it. Nobody knows.",
  },
  {
    feeling: "Your team is busy, but the clinic isn't improving.",
    detail: "Everyone is working hard. But without a structured loop from numbers to decisions to outcomes, effort doesn't turn into results.",
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
              The problem isn't data.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                It's what happens after you see it.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most clinics have the numbers. What they don't have is a system that turns those numbers into decisions, owners, and follow-through.
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
              ClinicLeader closes the loop. Scorecard to issue to action to outcome. Every week.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
