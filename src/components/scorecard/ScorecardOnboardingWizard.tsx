import { Sparkles, PenSquare, ArrowRight, Zap, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ScorecardOnboardingWizardProps {
  onCreateFromVTO: () => void;
  onManualSetup: () => void;
}

export const ScorecardOnboardingWizard = ({ 
  onCreateFromVTO, 
  onManualSetup 
}: ScorecardOnboardingWizardProps) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-3">
          Create Your Scorecard
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track your clinic's key performance indicators to drive weekly accountability
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
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
              Recommended for EOS organizations
            </p>
          </CardContent>
        </Card>

        {/* Secondary: Template Wizard */}
        <Card className="glass border-2 border-accent/30 hover:border-accent/50 transition-all hover:scale-[1.02] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Template Wizard
              </h3>
              <p className="text-muted-foreground text-sm">
                Pick metrics and get an Excel/Sheets template
              </p>
            </div>

            <ul className="text-left text-sm text-muted-foreground space-y-1.5 w-full">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Choose from preset metrics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Generate CSV/Excel template
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Works with Google Sheets
              </li>
            </ul>

            <Button 
              onClick={() => navigate('/scorecard/setup')}
              variant="outline"
              className="w-full mt-2 border-emerald-500/50 hover:bg-emerald-500/10"
              size="default"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Start Template Wizard
            </Button>

            <p className="text-xs text-muted-foreground">
              Great for existing spreadsheets
            </p>
          </CardContent>
        </Card>

        {/* Tertiary: Manual Setup */}
        <Card className="glass border border-border/50 hover:border-border transition-all hover:scale-[1.02]">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <PenSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Manual Setup
              </h3>
              <p className="text-muted-foreground text-sm">
                Build your scorecard from scratch
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
                No V/TO required
              </li>
            </ul>

            <Button 
              onClick={onManualSetup}
              variant="outline"
              className="w-full mt-2"
              size="default"
            >
              <PenSquare className="w-4 h-4 mr-2" />
              Start Manual Setup
            </Button>

            <p className="text-xs text-muted-foreground">
              Custom tracking needs
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
