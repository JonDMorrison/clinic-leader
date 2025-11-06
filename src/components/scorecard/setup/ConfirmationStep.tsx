import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ConfirmationStepProps {
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const ConfirmationStep = ({
  onSubmit,
  onBack,
  isSubmitting,
}: ConfirmationStepProps) => {
  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-center">You're All Set!</CardTitle>
          <p className="text-muted-foreground text-center">
            Ready to start tracking your clinic's performance?
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3 text-muted-foreground">
            <p>✓ Your metrics have been configured</p>
            <p>✓ Weekly tracking structure is ready</p>
            <p>✓ Team members can start entering data</p>
          </div>

          <div className="pt-6">
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              size="lg"
              className="gradient-brand px-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
      </div>
    </div>
  );
};
