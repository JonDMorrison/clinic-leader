import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

interface IntroStepProps {
  onNext: () => void;
}

export const IntroStep = ({ onNext }: IntroStepProps) => {
  return (
    <Card className="glass border-2">
      <CardContent className="p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Target className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground">
          Let's define what success looks like
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          You'll choose what metrics you want to track, who owns them, and how often they update.
        </p>
        
        <Button 
          onClick={onNext}
          size="lg"
          className="gradient-brand mt-8"
        >
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
};
