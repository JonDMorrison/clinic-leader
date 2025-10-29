import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountHolderData } from "@/lib/onboarding/validators";

interface AccountHolderProps {
  data: Partial<AccountHolderData>;
  onChange: (data: Partial<AccountHolderData>) => void;
  errors: Partial<Record<keyof AccountHolderData, string>>;
}

export const AccountHolder = ({ data, onChange, errors }: AccountHolderProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Account Holder Information</h2>
        <p className="text-muted-foreground">
          Let's start with your details as the primary contact for this organization.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="First Name"
          required
          error={errors.first_name}
          help="Your legal first name"
        >
          <Input
            value={data.first_name || ""}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
            placeholder="John"
          />
        </Field>

        <Field
          label="Last Name"
          required
          error={errors.last_name}
          help="Your legal last name"
        >
          <Input
            value={data.last_name || ""}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
            placeholder="Smith"
          />
        </Field>
      </div>

      <Field label="Email" required help="Your primary email address">
        <Input value={data.email || ""} disabled className="bg-muted" />
      </Field>

      <Field
        label="Role"
        required
        error={errors.role}
        help="Your role in the organization"
      >
        <Select
          value={data.role || ""}
          onValueChange={(value) =>
            onChange({ ...data, role: value as AccountHolderData["role"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Phone" help="Optional contact number">
        <Input
          value={data.phone || ""}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          type="tel"
        />
      </Field>
    </div>
  );
};
