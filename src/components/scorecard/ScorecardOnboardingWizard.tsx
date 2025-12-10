import { Sparkles, PenSquare, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ScorecardOnboardingWizardProps {
  onCreateFromVTO: () => void;
  onManualSetup: () => void;
}

export const ScorecardOnboardingWizard = ({ 
  onCreateFromVTO, 
  onManualSetup 
}: ScorecardOnboardingWizardProps) => {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-3">
          Create Your Scorecard
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track your clinic's key performance indicators to drive weekly accountability
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Primary: Create from V/TO */}
        <Card className="glass border-2 border-primary/30 hover:border-primary/50 transition-all hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
          <CardContent className="p-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Create Scorecard from V/TO
              </h3>
              <p className="text-muted-foreground text-sm">
                AI analyzes your V/TO goals and suggests KPIs to track on your weekly scorecard
              </p>
            </div>

            <ul className="text-left text-sm text-muted-foreground space-y-2 w-full">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                AI-powered KPI suggestions based on your strategy
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                Automatic links between metrics and V/TO goals
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                Recommended targets from your 1-year plan
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                Category organization pre-built
              </li>
            </ul>

            <Button 
              onClick={onCreateFromVTO}
              className="gradient-brand w-full mt-4"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create from V/TO
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-primary font-medium">
              Recommended for EOS-driven organizations
            </p>
          </CardContent>
        </Card>

        {/* Secondary: Manual Setup */}
        <Card className="glass border border-border/50 hover:border-border transition-all hover:scale-[1.02]">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <PenSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Do it Manually
              </h3>
              <p className="text-muted-foreground text-sm">
                Build your scorecard from scratch with custom metrics and template defaults
              </p>
            </div>

            <ul className="text-left text-sm text-muted-foreground space-y-2 w-full">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">✓</span>
                Full control over every metric
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">✓</span>
                Load from industry templates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">✓</span>
                Custom targets and owners
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">✓</span>
                No V/TO required
              </li>
            </ul>

            <Button 
              onClick={onManualSetup}
              variant="outline"
              className="w-full mt-4"
              size="lg"
            >
              <PenSquare className="w-4 h-4 mr-2" />
              Start Manual Setup
            </Button>

            <p className="text-xs text-muted-foreground">
              Great for custom tracking needs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="mt-10 p-6 glass rounded-2xl border border-border">
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
