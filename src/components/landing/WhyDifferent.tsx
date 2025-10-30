import { Target, DollarSign, Calendar, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const WhyDifferent = () => {
  const features = [
    {
      icon: Target,
      title: "Data-Driven Decisions",
      description: "Real-time insights into your clinic's performance with metrics that actually matter"
    },
    {
      icon: DollarSign,
      title: "Proven Results",
      description: "See measurable improvements in productivity, profitability, and patient satisfaction"
    },
    {
      icon: Calendar,
      title: "Efficient Meetings",
      description: "Run focused team meetings that solve real problems and drive action"
    },
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Get your practice up and running in days, not months, with guided implementation"
    }
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Clinic Leader Works</h2>
          <p className="text-xl text-muted-foreground">
            Purpose-built for healthcare practices that want to scale
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-8 h-8 text-brand" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
