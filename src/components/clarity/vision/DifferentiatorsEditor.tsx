import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_DIFFERENTIATORS = [
  "Advanced technology and treatment techniques",
  "Personalized, one-on-one patient care",
  "Comprehensive, multi-disciplinary approach",
  "Extended appointment times for thorough care",
  "Evidence-based treatment protocols",
  "Focus on patient education and empowerment",
  "Same-day and emergency appointments available",
  "Specialized expertise in chronic conditions",
  "Holistic mind-body wellness approach",
  "State-of-the-art facility and equipment",
  "Collaborative care with other specialists",
  "Long-term patient relationships and continuity"
];

interface DifferentiatorsEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  organizationId: string;
}

export function DifferentiatorsEditor({ values, onChange, organizationId }: DifferentiatorsEditorProps) {
  const { toast } = useToast();

  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  const handleSuggestedClick = (suggested: string) => {
    // If already selected, remove it
    if (values.includes(suggested)) {
      onChange(values.filter(v => v !== suggested));
      return;
    }

    // Find first empty slot
    const emptyIndex = values.findIndex(v => !v || v.trim() === "");
    if (emptyIndex !== -1) {
      updateValue(emptyIndex, suggested);
    } else if (values.length < 3) {
      // Add if we have room
      onChange([...values, suggested]);
    } else {
      toast({
        title: "Maximum reached",
        description: "You can only have 3 differentiators. Remove one to add another.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Top 3 Differentiators</label>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Click suggestions below or write your own:
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_DIFFERENTIATORS.map((suggested) => (
            <Badge
              key={suggested}
              variant={values.includes(suggested) ? "brand" : "muted"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleSuggestedClick(suggested)}
            >
              {suggested.length > 45 ? suggested.slice(0, 45) + "..." : suggested}
            </Badge>
          ))}
        </div>
      </div>

      {[0, 1, 2].map((index) => (
        <Input
          key={index}
          placeholder={`${index + 1}. What makes you unique?`}
          value={values[index] || ""}
          onChange={(e) => updateValue(index, e.target.value)}
        />
      ))}
    </div>
  );
}
