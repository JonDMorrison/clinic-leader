import { Sparkles, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ScorecardOnboardingWizardProps {
  onCreateFromVTO?: () => void; // Keep for backwards compatibility but unused
  onManualSetup: () => void;
  hasActiveVTO: boolean;
}

export const ScorecardOnboardingWizard = ({ 
  onManualSetup,
  hasActiveVTO
}: ScorecardOnboardingWizardProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Set Up Your Scorecard
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Track the numbers that drive your clinic's success with weekly accountability
        </p>
      </div>

      {/* Single CTA Card */}
      <Card className="glass border-2 border-primary/30 hover:border-primary/50 transition-all hover:scale-[1.01] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
        <CardContent className="p-8">
          {/* What's included */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-foreground">
              The wizard will help you:
            </h3>
            <ul className="space-y-3">
              {hasActiveVTO && (
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Get AI suggestions from your V/TO</span>
                    <p className="text-sm text-muted-foreground">We found your Vision Planner — we'll suggest KPIs aligned to your goals</p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Choose from clinic templates</span>
                  <p className="text-sm text-muted-foreground">Operations, Finance, Clinical Outcomes, Referrals — pick what matters</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-foreground">Add custom metrics</span>
                  <p className="text-sm text-muted-foreground">Track anything specific to your clinic's needs</p>
                </div>
              </li>
            </ul>
          </div>

          {/* VTO Status Indicator */}
          {hasActiveVTO ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">V/TO detected</span>
                <span className="text-muted-foreground">— AI will suggest metrics from your goals</span>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">No V/TO yet — you can</span>
                <button 
                  onClick={() => navigate('/vto/vision')}
                  className="text-primary hover:underline font-medium"
                >
                  create one later
                </button>
                <span className="text-muted-foreground">to align your metrics</span>
              </div>
            </div>
          )}

          <Button 
            onClick={onManualSetup}
            className="gradient-brand w-full"
            size="lg"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

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
