import { Sparkles, PenSquare, ArrowRight, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ScorecardOnboardingWizardProps {
  onCreateFromVTO: () => void;
  onManualSetup: () => void;
  hasActiveVTO: boolean;
}

export const ScorecardOnboardingWizard = ({ 
  onCreateFromVTO, 
  onManualSetup,
  hasActiveVTO
}: ScorecardOnboardingWizardProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-3">
          Create Your Scorecard
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track your clinic's key performance indicators to drive weekly accountability
        </p>
      </div>

      {hasActiveVTO ? (
        /* VTO exists: Show 2 clear options */
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary: Create from V/TO */}
          <Card className="glass border-2 border-primary/30 hover:border-primary/50 transition-all hover:scale-[1.02] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Create from V/TO
                </h3>
                <p className="text-muted-foreground text-sm">
                  AI analyzes your V/TO goals and suggests KPIs
                </p>
              </div>

              <ul className="text-left text-sm text-muted-foreground space-y-1.5 w-full">
                <li className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  AI-powered suggestions
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  Auto-links to V/TO goals
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  Recommended targets
                </li>
              </ul>

              <Button 
                onClick={onCreateFromVTO}
                className="gradient-brand w-full mt-2"
                size="default"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create from V/TO
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-primary font-medium">
                Recommended
              </p>
            </CardContent>
          </Card>

          {/* Secondary: Set up manually */}
          <Card className="glass border border-border/50 hover:border-border transition-all hover:scale-[1.02]">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <PenSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Set Up Manually
                </h3>
                <p className="text-muted-foreground text-sm">
                  Build your scorecard from scratch or use templates
                </p>
              </div>

              <ul className="text-left text-sm text-muted-foreground space-y-1.5 w-full">
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">✓</span>
                  Full control over metrics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">✓</span>
                  Load industry templates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">✓</span>
                  Generate Excel/Sheets template
                </li>
              </ul>

              <Button 
                onClick={onManualSetup}
                variant="outline"
                className="w-full mt-2"
                size="default"
              >
                <PenSquare className="w-4 h-4 mr-2" />
                Set Up Manually
              </Button>

              <p className="text-xs text-muted-foreground">
                Custom tracking needs
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* No VTO: Prompt to create VTO first */
        <div className="space-y-6">
          <Card className="glass border-2 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-amber-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  For the best experience, create your V/TO first
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Your Vision/Traction Organizer helps us suggest the right KPIs that align with your goals
                </p>
              </div>

              <Button 
                onClick={() => navigate('/vto/vision')}
                className="bg-amber-600 hover:bg-amber-700"
                size="default"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Your V/TO
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-3">Or continue without V/TO</p>
            <Button 
              onClick={onManualSetup}
              variant="outline"
              size="default"
            >
              <PenSquare className="w-4 h-4 mr-2" />
              Set Up Manually
            </Button>
          </div>
        </div>
      )}

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
