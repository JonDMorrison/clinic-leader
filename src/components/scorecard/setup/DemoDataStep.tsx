import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart3 } from "lucide-react";

interface DemoDataStepProps {
  includeDemoData: boolean;
  onToggle: (value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export const DemoDataStep = ({
  includeDemoData,
  onToggle,
  onNext,
  onBack,
}: DemoDataStepProps) => {
  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Optional Demo Data</CardTitle>
          <p className="text-muted-foreground">
            Would you like to see your scorecard in action right away?
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3 p-6 bg-accent/10 rounded-lg">
            <Checkbox
              id="demo-data"
              checked={includeDemoData}
              onCheckedChange={onToggle}
            />
            <div className="space-y-2">
              <Label htmlFor="demo-data" className="text-base font-medium cursor-pointer">
                Preload with sample weekly data
              </Label>
              <p className="text-sm text-muted-foreground">
                We'll add random sample data for the next 4 weeks so you can see graphs and trends immediately. 
                You can replace this with real data at any time.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Demo data is great for exploring the interface, 
              but you can skip this if you prefer to start with a clean slate.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
};
