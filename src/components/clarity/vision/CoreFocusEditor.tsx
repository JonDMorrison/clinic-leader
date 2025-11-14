import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_PURPOSES = [
  "Empowering patients to achieve optimal health and wellness",
  "Providing compassionate, patient-centered care",
  "Transforming lives through innovative healthcare",
  "Delivering exceptional care that improves quality of life",
  "Creating a healthier community through personalized care",
  "Supporting patients on their journey to better health"
];

const SUGGESTED_NICHES = [
  "Integrated pain management and rehabilitation",
  "Family medicine with holistic approach",
  "Sports medicine and performance optimization",
  "Chronic disease management and prevention",
  "Pediatric care with developmental focus",
  "Women's health and wellness"
];

interface CoreFocusEditorProps {
  purpose: string;
  niche: string;
  onChange: (data: { purpose: string; niche: string }) => void;
  organizationId: string;
}

export function CoreFocusEditor({ purpose, niche, onChange, organizationId }: CoreFocusEditorProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Core Focus</label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Purpose</label>
        <p className="text-sm text-muted-foreground">
          Click a suggestion below or write your own:
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_PURPOSES.map((suggested) => (
            <Badge
              key={suggested}
              variant={purpose === suggested ? "brand" : "muted"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onChange({ purpose: suggested, niche })}
            >
              {suggested.length > 50 ? suggested.slice(0, 50) + "..." : suggested}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Why your clinic exists"
          value={purpose}
          onChange={(e) => onChange({ purpose: e.target.value, niche })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Niche</label>
        <p className="text-sm text-muted-foreground">
          Click a suggestion below or write your own:
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_NICHES.map((suggested) => (
            <Badge
              key={suggested}
              variant={niche === suggested ? "brand" : "muted"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onChange({ purpose, niche: suggested })}
            >
              {suggested}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="What you specialize in"
          value={niche}
          onChange={(e) => onChange({ purpose, niche: e.target.value })}
        />
      </div>
    </div>
  );
}
