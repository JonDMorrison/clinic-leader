import { Field } from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { OperationalSetupData } from "@/lib/onboarding/validators";
import { Badge } from "@/components/ui/badge";

interface OperationalSetupProps {
  data: Partial<OperationalSetupData>;
  onChange: (data: Partial<OperationalSetupData>) => void;
  errors: Partial<Record<keyof OperationalSetupData, string>>;
}

const AVAILABLE_INTEGRATIONS = [
  "Jane",
  "Google Calendar",
  "QuickBooks",
  "Lightspeed POS",
];

const AVAILABLE_METRICS = [
  "Visits",
  "New Patients",
  "Revenue",
  "No-Show %",
  "Collection Rate",
  "AR 30/60/90/120",
  "Referrals",
  "Time-to-Next-Available",
  "Utilization",
  "Other",
];

export const OperationalSetup = ({
  data,
  onChange,
  errors,
}: OperationalSetupProps) => {
  const toggleIntegration = (integration: string) => {
    const current = data.integrations || [];
    const updated = current.includes(integration)
      ? current.filter((i) => i !== integration)
      : [...current, integration];
    onChange({ ...data, integrations: updated });
  };

  const toggleMetric = (metric: string) => {
    const current = data.primary_metrics || [];
    const updated = current.includes(metric)
      ? current.filter((m) => m !== metric)
      : [...current, metric];
    onChange({ ...data, primary_metrics: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Operational Setup</h2>
        <p className="text-muted-foreground">
          Configure your systems, integrations, and key metrics.
        </p>
      </div>

      <Field
        label="EHR System"
        required
        error={errors.ehr_system}
        help="Your electronic health record system"
      >
        <Select
          value={data.ehr_system}
          onValueChange={(value) =>
            onChange({ ...data, ehr_system: value as OperationalSetupData["ehr_system"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select EHR system" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Jane">Jane</SelectItem>
            <SelectItem value="ChiroTouch">ChiroTouch</SelectItem>
            <SelectItem value="Notero">Notero</SelectItem>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Integrations" help="Systems you'd like to connect">
        <div className="space-y-3 border rounded-lg p-4">
          {AVAILABLE_INTEGRATIONS.map((integration) => (
            <div key={integration} className="flex items-center space-x-2">
              <Checkbox
                id={integration}
                checked={data.integrations?.includes(integration)}
                onCheckedChange={() => toggleIntegration(integration)}
              />
              <label htmlFor={integration} className="text-sm cursor-pointer">
                {integration}
              </label>
            </div>
          ))}
        </div>
      </Field>

      <Field
        label="Primary Metrics"
        help="Select the KPIs most important to your practice"
      >
        <div className="flex flex-wrap gap-2 border rounded-lg p-4">
          {AVAILABLE_METRICS.map((metric) => (
            <Badge
              key={metric}
              variant={
                data.primary_metrics?.includes(metric) ? "default" : "outline"
              }
              className="cursor-pointer"
              onClick={() => toggleMetric(metric)}
            >
              {metric}
            </Badge>
          ))}
        </div>
      </Field>

      <Field
        label="Review Cadence"
        required
        help="How often you'll review performance metrics"
      >
        <Select
          value={data.review_cadence || "weekly"}
          onValueChange={(value) =>
            onChange({
              ...data,
              review_cadence: value as OperationalSetupData["review_cadence"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly (Recommended)</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
};
