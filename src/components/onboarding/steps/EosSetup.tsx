import { Field } from "@/components/ui/Field";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { EosSetupData } from "@/lib/onboarding/validators";
import { DEFAULT_MODULES } from "@/lib/onboarding/defaults";

interface EosSetupProps {
  data: Partial<EosSetupData>;
  onChange: (data: Partial<EosSetupData>) => void;
  errors: Partial<Record<keyof EosSetupData, string>>;
}

export const EosSetup = ({ data, onChange, errors }: EosSetupProps) => {
  const toggleModule = (module: string) => {
    const current = data.enable_modules || DEFAULT_MODULES;
    const updated = current.includes(module)
      ? current.filter((m) => m !== module)
      : [...current, module];
    onChange({ ...data, enable_modules: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">EOS Setup</h2>
        <p className="text-muted-foreground">
          Configure your EOS (Entrepreneurial Operating System) tools and vision.
        </p>
      </div>

      <Field
        label="Enable EOS"
        help="Turn on EOS tools like Rocks, V/TO, and L10 Meetings"
      >
        <div className="flex items-center space-x-2">
          <Switch
            checked={data.eos_enabled || false}
            onCheckedChange={(checked) => onChange({ ...data, eos_enabled: checked })}
          />
          <span className="text-sm">
            {data.eos_enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </Field>

      {data.eos_enabled && (
        <>
          <Field
            label="Meeting Rhythm"
            help="How often will you hold Level 10 meetings?"
          >
            <Select
              value={data.meeting_rhythm || ""}
              onValueChange={(value) =>
                onChange({
                  ...data,
                  meeting_rhythm: value as EosSetupData["meeting_rhythm"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meeting cadence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly_l10">Weekly L10</SelectItem>
                <SelectItem value="monthly_l10">Monthly L10</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Vision Statement"
            help="Your 10-year target or long-term vision (optional)"
          >
            <Textarea
              value={data.vision_statement || ""}
              onChange={(e) =>
                onChange({ ...data, vision_statement: e.target.value })
              }
              placeholder="Describe where you see your organization in 10 years..."
              rows={4}
            />
          </Field>

          <Field
            label="Enable Modules"
            help="Select which EOS tools you want to use"
          >
            <div className="space-y-3 border rounded-lg p-4">
              {DEFAULT_MODULES.map((module) => (
                <div key={module} className="flex items-start space-x-2">
                  <Checkbox
                    id={module}
                    checked={
                      data.enable_modules?.includes(module) ??
                      DEFAULT_MODULES.includes(module)
                    }
                    onCheckedChange={() => toggleModule(module)}
                  />
                  <div className="flex-1">
                    <label htmlFor={module} className="text-sm cursor-pointer font-medium">
                      {module}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getModuleDescription(module)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Field>
        </>
      )}
    </div>
  );
};

const getModuleDescription = (module: string): string => {
  const descriptions: Record<string, string> = {
    Scorecard: "Track key metrics weekly with your team",
    Rocks: "Set and manage quarterly priorities",
    "People Analyzer": "Evaluate team members against core values",
    "V/TO": "Define your vision and strategic plan",
    Issues: "Identify, discuss, and solve problems",
    "L10 Meetings": "Run structured 90-minute weekly meetings",
  };
  return descriptions[module] || "";
};
