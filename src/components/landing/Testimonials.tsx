import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "ClinicLeader transformed how we run our weekly meetings. We went from status updates to actual decision-making. Our team is more aligned than ever.",
    author: "Dr. Sarah Chen",
    role: "Clinic Owner",
    clinic: "Wellness Physical Therapy",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop",
    rating: 5,
  },
  {
    quote: "The scorecard alone saved us hours every week. We can see exactly where we stand on our goals before every meeting. No more digging through spreadsheets.",
    author: "Michael Rodriguez",
    role: "Practice Manager",
    clinic: "Family Care Chiropractic",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    rating: 5,
  },
  {
    quote: "Our SOPs actually get used now. Team members can find answers instantly instead of interrupting me. It's like having an extra manager on staff.",
    author: "Jennifer Park",
    role: "Operations Director",
    clinic: "Peak Performance PT",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-muted/30 to-background">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Trusted by clinic leaders who{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              get results
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what clinic owners and practice managers are saying about ClinicLeader
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative h-full p-8 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
                {/* Quote icon */}
                <div className="absolute -top-4 left-8">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Quote className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4 pt-2">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground leading-relaxed mb-6 italic">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/10"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-primary">{testimonial.clinic}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust logos section */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground mb-8 uppercase tracking-wider">
            Trusted by clinics across the country
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {["Physical Therapy", "Chiropractic", "Dental", "Optometry", "Medical Spa", "Wellness"].map((type, i) => (
              <div
                key={i}
                className="px-6 py-3 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground"
              >
                {type} Clinics
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
