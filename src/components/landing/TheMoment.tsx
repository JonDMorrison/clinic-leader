import { motion } from "framer-motion";

const moments = [
  {
    feeling: "You review the numbers, but nothing changes.",
    detail: "The scorecard says utilization is down. Everyone nods. Nobody owns the fix. Next week, same number, same conversation.",
  },
  {
    feeling: "Meetings feel productive but produce nothing.",
    detail: "You talk about the same issues every week. No one is assigned. No deadline is set. No one follows up.",
  },
  {
    feeling: "You made a change but can't tell if it worked.",
    detail: "You changed the cancellation policy three weeks ago. Did the number move? Nobody tracked it. Nobody knows.",
  },
  {
    feeling: "Your team is busy, but the clinic isn't improving.",
    detail: "Everyone is working hard. But without a system that connects numbers to decisions to measured outcomes, effort doesn't turn into results.",
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
              Most clinics have the numbers. What they don't have is a system that turns those numbers into assigned decisions and measured outcomes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {moments.map((moment, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="group relative p-6 rounded-3xl glass border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_hsl(210_100%_45%_/_0.12)] overflow-hidden"
              >
                {/* Accent gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent opacity-60 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative">
                  <p className="text-lg font-bold text-foreground mb-2 leading-snug">"{moment.feeling}"</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{moment.detail}</p>
                </div>
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
              ClinicLeader fixes the gap between seeing a number and doing something about it. Metric to issue to owner to outcome. Every week.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
