import { useState } from "react";
import { useCoreValues } from "@/hooks/useCoreValues";
import { useCoreValuesAck } from "@/hooks/useCoreValuesAck";
import { generateCoreValuesHash } from "@/lib/core-values/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Heart } from "lucide-react";

interface CoreValuesOnboardingStepProps {
  onComplete: () => void;
}

export function CoreValuesOnboardingStep({ onComplete }: CoreValuesOnboardingStepProps) {
  const { activeValues, isLoading: valuesLoading, seedDefaults } = useCoreValues();
  const { acknowledge, isLoading: ackLoading } = useCoreValuesAck();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Seed defaults if needed
  if (!valuesLoading && activeValues.length === 0) {
    seedDefaults.mutate();
  }

  const handleContinue = async () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      const hash = generateCoreValuesHash(activeValues);
      await acknowledge.mutateAsync(hash);
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  if (valuesLoading || ackLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">How We Show Up Here</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          These are the values that guide everything we do.
        </p>
      </div>

      <div className="space-y-2">
        {activeValues.map((value, index) => (
          <Card key={value.id} className="overflow-hidden border-border/50 transition-colors hover:border-border">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm leading-tight">{value.title}</h3>
                  {value.short_behavior && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {value.short_behavior}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-t pt-6">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <label htmlFor="agree" className="text-sm cursor-pointer">
            <span className="font-medium">I understand and commit to living these values.</span>
            <p className="text-muted-foreground mt-1">
              I will look for opportunities to demonstrate these values in my daily work with patients and teammates.
            </p>
          </label>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={!agreed || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          "Saving..."
        ) : (
          <>
            <Heart className="h-4 w-4 mr-2" />
            Continue
          </>
        )}
      </Button>
    </div>
  );
}
