import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sparkles, Plus, Heart } from "lucide-react";
import { CoreValueEntry, OnboardingData } from "@/lib/onboarding/validators";

interface ValuesBuilderProps {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
  errors: Partial<Record<string, string>>;
}

// Common healthcare clinic core value suggestions
const SUGGESTIONS: CoreValueEntry[] = [
  { title: "Patient-Centered Care", short_behavior: "Put patients first in every decision. Listen actively and respond with empathy." },
  { title: "Continuous Improvement", short_behavior: "Seek feedback, learn from mistakes, and always look for better ways to serve." },
  { title: "Team Collaboration", short_behavior: "Support each other, share knowledge, and celebrate wins together." },
  { title: "Integrity & Transparency", short_behavior: "Be honest, keep promises, and communicate openly even when it's hard." },
  { title: "Excellence in Care", short_behavior: "Deliver the highest quality care with attention to detail and professionalism." },
  { title: "Compassion & Empathy", short_behavior: "Treat everyone with kindness and understanding, recognizing their unique needs." },
  { title: "Accountability", short_behavior: "Own your work, follow through on commitments, and take responsibility." },
  { title: "Innovation", short_behavior: "Embrace new ideas, challenge the status quo, and find creative solutions." },
  { title: "Work-Life Balance", short_behavior: "Respect boundaries, support wellness, and maintain sustainable work habits." },
  { title: "Community Focus", short_behavior: "Serve our local community and build lasting relationships beyond the clinic." },
];

export const ValuesBuilder = ({ data, onChange, errors }: ValuesBuilderProps) => {
  const [customTitle, setCustomTitle] = useState("");
  const [customBehavior, setCustomBehavior] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const values = data.core_values || [];

  const addValue = (value: CoreValueEntry) => {
    if (values.length >= 7) return;
    if (values.some(v => v.title === value.title)) return;
    onChange({ ...data, core_values: [...values, value] });
  };

  const removeValue = (index: number) => {
    onChange({ ...data, core_values: values.filter((_, i) => i !== index) });
  };

  const addCustomValue = () => {
    if (!customTitle.trim()) return;
    addValue({ title: customTitle.trim(), short_behavior: customBehavior.trim() || undefined });
    setCustomTitle("");
    setCustomBehavior("");
    setShowCustomForm(false);
  };

  const availableSuggestions = SUGGESTIONS.filter(
    s => !values.some(v => v.title === s.title)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Your Core Values
        </h2>
        <p className="text-muted-foreground">
          Define 3-7 values that guide how your team works. These will appear throughout the app to keep your culture alive.
        </p>
      </div>

      {errors.core_values && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors.core_values}
        </div>
      )}

      {/* Selected Values */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Selected Values ({values.length}/7)
          </span>
          {values.length < 3 && (
            <span className="text-xs text-muted-foreground">
              Minimum 3 required
            </span>
          )}
        </div>
        
        {values.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No values selected yet. Choose from suggestions below or create your own.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {values.map((value, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm leading-tight">{value.title}</h4>
                        {value.short_behavior && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {value.short_behavior}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeValue(index)}
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Value */}
      {values.length < 7 && (
        <div className="space-y-3">
          {!showCustomForm ? (
            <Button
              variant="outline"
              onClick={() => setShowCustomForm(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Value
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Field label="Value Name" required>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Patient-Centered Care"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomValue()}
                  />
                </Field>
                <Field label="Behavior Description" help="How should team members demonstrate this value?">
                  <Input
                    value={customBehavior}
                    onChange={(e) => setCustomBehavior(e.target.value)}
                    placeholder="e.g., Listen actively, respond with empathy"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button onClick={addCustomValue} disabled={!customTitle.trim()}>
                    Add Value
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCustomForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Suggestions */}
      {values.length < 7 && availableSuggestions.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-muted-foreground">
            Or choose from common healthcare values:
          </span>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((suggestion) => (
              <Badge
                key={suggestion.title}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors py-1.5 px-3"
                onClick={() => addValue(suggestion)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {suggestion.title}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
