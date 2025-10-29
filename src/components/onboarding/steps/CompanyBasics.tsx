import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyBasicsData } from "@/lib/onboarding/validators";
import { useEffect } from "react";
import {
  getTimezoneByCountry,
  getCurrencyByCountry,
  getUnitSystemByCountry,
} from "@/lib/onboarding/defaults";

interface CompanyBasicsProps {
  data: Partial<CompanyBasicsData>;
  onChange: (data: Partial<CompanyBasicsData>) => void;
  errors: Partial<Record<keyof CompanyBasicsData, string>>;
}

export const CompanyBasics = ({ data, onChange, errors }: CompanyBasicsProps) => {
  // Auto-fill timezone, currency, unit_system when country changes
  useEffect(() => {
    if (data.country && !data.timezone) {
      onChange({
        ...data,
        timezone: getTimezoneByCountry(data.country),
        currency: getCurrencyByCountry(data.country),
        unit_system: getUnitSystemByCountry(data.country),
      });
    }
  }, [data.country]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Company Information</h2>
        <p className="text-muted-foreground">
          Tell us about your clinic and where you're located.
        </p>
      </div>

      <Field
        label="Company Name"
        required
        error={errors.company_name}
        help="The legal or operating name of your clinic"
      >
        <Input
          value={data.company_name || ""}
          onChange={(e) => onChange({ ...data, company_name: e.target.value })}
          placeholder="Northwest Injury Clinics"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Industry"
          required
          error={errors.industry}
          help="Your primary healthcare specialty"
        >
          <Select
            value={data.industry || ""}
            onValueChange={(value) =>
              onChange({ ...data, industry: value as CompanyBasicsData["industry"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Chiropractic">Chiropractic</SelectItem>
              <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
              <SelectItem value="Multidisciplinary">Multidisciplinary</SelectItem>
              <SelectItem value="Counselling">Counselling</SelectItem>
              <SelectItem value="Medical">Medical</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Team Size"
          required
          error={errors.team_size}
          help="Total number of staff members"
        >
          <Input
            type="number"
            min={1}
            max={500}
            value={data.team_size || ""}
            onChange={(e) =>
              onChange({ ...data, team_size: parseInt(e.target.value) || 0 })
            }
            placeholder="15"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City" required error={errors.location_city}>
          <Input
            value={data.location_city || ""}
            onChange={(e) => onChange({ ...data, location_city: e.target.value })}
            placeholder="Seattle"
          />
        </Field>

        <Field label="State/Province" required error={errors.location_region}>
          <Input
            value={data.location_region || ""}
            onChange={(e) => onChange({ ...data, location_region: e.target.value })}
            placeholder="WA"
          />
        </Field>
      </div>

      <Field label="Country" required error={errors.country}>
        <Select
          value={data.country || ""}
          onValueChange={(value) => onChange({ ...data, country: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USA">United States</SelectItem>
            <SelectItem value="Canada">Canada</SelectItem>
            <SelectItem value="UK">United Kingdom</SelectItem>
            <SelectItem value="Australia">Australia</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Timezone" required error={errors.timezone}>
          <Input
            value={data.timezone || ""}
            onChange={(e) => onChange({ ...data, timezone: e.target.value })}
            placeholder="America/Los_Angeles"
          />
        </Field>

        <Field label="Currency" required error={errors.currency}>
          <Input
            value={data.currency || ""}
            onChange={(e) => onChange({ ...data, currency: e.target.value })}
            placeholder="USD"
          />
        </Field>

        <Field label="Unit System" required>
          <Select
            value={data.unit_system || "imperial"}
            onValueChange={(value) =>
              onChange({ ...data, unit_system: value as "imperial" | "metric" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="imperial">Imperial</SelectItem>
              <SelectItem value="metric">Metric</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
};
