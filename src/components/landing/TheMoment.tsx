import { motion } from "framer-motion";

const moments = [
  {
    feeling: "The week felt busy, but revenue didn't match.",
    detail: "Providers were booked, the front desk was slammed, yet the numbers say otherwise.",
  },
  {
    feeling: "Staff seem overloaded, but gaps appear in the schedule.",
    detail: "Some providers are underbooked while others are stretched thin. You can feel it, but can't see it clearly.",
  },
  {
    feeling: "Reports exist, but nobody knows what to focus on.",
    detail: "Your EMR has data. Your spreadsheets have data. But when Monday's meeting starts, you're still guessing.",
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
              You already know{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                something's off.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most clinic owners have the same experience. Things feel off, but they can't point to exactly what or how much it's costing.
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
              ClinicLeader shows you exactly what's happening, every week, without building another spreadsheet.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
