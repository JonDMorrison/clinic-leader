import { Database, Target, ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ScorecardOnboardingWizardProps {
  onCreateFromVTO?: () => void;
  onManualSetup: () => void;
  hasActiveVTO: boolean;
}

export const ScorecardOnboardingWizard = ({ 
  onManualSetup,
  hasActiveVTO
}: ScorecardOnboardingWizardProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-6 lg:py-8">
      <div className="text-center mb-6 lg:mb-8">
        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Database className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Your Scorecard Starts with Data
        </h2>
        <p className="text-sm lg:text-base text-muted-foreground max-w-lg mx-auto">
          Connect your data first, then choose which metrics to track on your scorecard
        </p>
      </div>

      {/* Primary CTA: Go to Data */}
      <Card className="glass border-2 border-primary/30 hover:border-primary/50 transition-all hover:scale-[1.01] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
        <CardContent className="p-5 lg:p-6">
          <div className="space-y-3 mb-5 lg:mb-6">
            <h3 className="text-base lg:text-lg font-semibold text-foreground">
              How it works:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Connect your data source</span>
                  <p className="text-sm text-muted-foreground">Link Jane, upload a workbook, or enter data manually</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Choose metrics that matter</span>
                  <p className="text-sm text-muted-foreground">Browse your available data and click "Track This" to add to your scorecard</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Set goals and track weekly</span>
                  <p className="text-sm text-muted-foreground">Define targets so you know when metrics are on or off track</p>
                </div>
              </li>
            </ul>
          </div>

          <Button 
            onClick={() => navigate('/data')}
            className="gradient-brand w-full"
            size="lg"
          >
            See Your Data
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Secondary: Manual setup */}
      <div className="mt-4 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualSetup}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4 mr-1" />
          Or create custom metrics manually
        </Button>
      </div>

      {/* Tips Section */}
      <div className="mt-6 lg:mt-8 p-4 lg:p-5 glass rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <div className="text-xl lg:text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-foreground text-sm lg:text-base mb-1.5 lg:mb-2">Tips for Success</h4>
            <ul className="text-xs lg:text-sm text-muted-foreground space-y-0.5 lg:space-y-1">
              <li>• Start with 5-8 core KPIs to avoid overwhelm</li>
              <li>• Most clinics see results within 4 weeks of consistent tracking</li>
              <li>• You can always add more KPIs later as needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
