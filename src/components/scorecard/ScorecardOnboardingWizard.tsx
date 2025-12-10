import { Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ScorecardOnboardingWizardProps {
  onQuickStart: () => void;
  onCustomKpi: () => void;
}

export const ScorecardOnboardingWizard = ({ 
  onQuickStart, 
  onCustomKpi 
}: ScorecardOnboardingWizardProps) => {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-3">
          Get Started Tracking Performance
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose how you'd like to begin tracking your clinic's key performance indicators
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Start */}
        <Card className="glass border-2 border-primary/20 hover:border-primary/40 transition-all hover:scale-[1.02]">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <h3 className="text-xl font-semibold text-foreground">
              🚀 Quick Start
            </h3>
            
            <p className="text-muted-foreground text-sm">
              Load 5-8 industry-standard KPIs tailored for healthcare clinics. 
              Perfect for getting started quickly.
            </p>

            <ul className="text-left text-sm text-muted-foreground space-y-2">
              <li>✓ Pre-configured production metrics</li>
              <li>✓ Financial tracking KPIs</li>
              <li>✓ Patient satisfaction indicators</li>
              <li>✓ Operational efficiency measures</li>
            </ul>

            <Button 
              onClick={onQuickStart}
              className="gradient-brand w-full mt-4"
              size="lg"
            >
              Start Setup
            </Button>

            <p className="text-xs text-muted-foreground">
              💡 Recommended for most clinics
            </p>
          </CardContent>
        </Card>

        {/* Custom KPI */}
        <Card className="glass border-2 border-accent/20 hover:border-accent/40 transition-all hover:scale-[1.02]">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-accent" />
            </div>
            
            <h3 className="text-xl font-semibold text-foreground">
              🎯 Custom KPI
            </h3>
            
            <p className="text-muted-foreground text-sm">
              Create your own KPI from scratch. Perfect if you have specific 
              metrics you want to track.
            </p>

            <ul className="text-left text-sm text-muted-foreground space-y-2">
              <li>✓ Define your own metrics</li>
              <li>✓ Set custom targets</li>
              <li>✓ Choose tracking frequency</li>
              <li>✓ Assign team owners</li>
            </ul>

            <Button 
              onClick={onCustomKpi}
              variant="outline"
              className="w-full mt-4"
              size="lg"
            >
              + Add Custom KPI
            </Button>

            <p className="text-xs text-muted-foreground">
              Great for specialized tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 glass rounded-2xl border border-border">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Tips for Success</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Start with 5-8 core KPIs to avoid overwhelm</li>
              <li>• Most clinics see results within 4 weeks of consistent tracking</li>
              <li>• Set weekly reminders to update your metrics</li>
              <li>• You can always add more KPIs later as needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
