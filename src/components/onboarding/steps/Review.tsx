import { OnboardingData } from "@/lib/onboarding/validators";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Edit } from "lucide-react";

interface ReviewProps {
  data: Partial<OnboardingData>;
  onEdit: (step: number) => void;
}

export const Review = ({ data, onEdit }: ReviewProps) => {
  const [authorizedCheck, setAuthorizedCheck] = useState(false);
  const [termsCheck, setTermsCheck] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review & Confirm</h2>
        <p className="text-muted-foreground">
          Please review your information before completing setup.
        </p>
      </div>

      {/* Account Holder Summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Account Holder</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(0)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <p>
            <span className="font-medium">Name:</span> {data.first_name}{" "}
            {data.last_name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {data.email}
          </p>
          <p>
            <span className="font-medium">Role:</span> {data.role}
          </p>
          {data.phone && (
            <p>
              <span className="font-medium">Phone:</span> {data.phone}
            </p>
          )}
        </div>
      </div>

      {/* Company Basics Summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Company Information</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <p>
            <span className="font-medium">Company:</span> {data.company_name}
          </p>
          <p>
            <span className="font-medium">Industry:</span> {data.industry}
          </p>
          <p>
            <span className="font-medium">Team Size:</span> {data.team_size}
          </p>
          <p>
            <span className="font-medium">Location:</span> {data.location_city},{" "}
            {data.location_region}, {data.country}
          </p>
          <p>
            <span className="font-medium">Timezone:</span> {data.timezone}
          </p>
        </div>
      </div>

      {/* Operational Setup Summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Operational Setup</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <p>
            <span className="font-medium">EHR System:</span> {data.ehr_system}
          </p>
          <p>
            <span className="font-medium">Review Cadence:</span>{" "}
            {data.review_cadence}
          </p>
          {data.integrations && data.integrations.length > 0 && (
            <p>
              <span className="font-medium">Integrations:</span>{" "}
              {data.integrations.join(", ")}
            </p>
          )}
          {data.primary_metrics && data.primary_metrics.length > 0 && (
            <p>
              <span className="font-medium">Primary Metrics:</span>{" "}
              {data.primary_metrics.join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* EOS Setup Summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">EOS Configuration</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <p>
            <span className="font-medium">EOS Enabled:</span>{" "}
            {data.eos_enabled ? "Yes" : "No"}
          </p>
          {data.eos_enabled && (
            <>
              <p>
                <span className="font-medium">Meeting Rhythm:</span>{" "}
                {data.meeting_rhythm}
              </p>
              {data.core_values && data.core_values.length > 0 && (
                <p>
                  <span className="font-medium">Core Values:</span>{" "}
                  {data.core_values.join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Branding Summary */}
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Branding</h3>
          <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          {data.logo_url && (
            <p>
              <span className="font-medium">Logo:</span> Uploaded
            </p>
          )}
          {data.brand_color && (
            <p className="flex items-center gap-2">
              <span className="font-medium">Brand Color:</span>
              <span
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: data.brand_color }}
              />
              {data.brand_color}
            </p>
          )}
          {data.website_url && (
            <p>
              <span className="font-medium">Website:</span> {data.website_url}
            </p>
          )}
        </div>
      </div>

      {/* Confirmations */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="authorized"
            checked={authorizedCheck}
            onCheckedChange={(checked) => setAuthorizedCheck(checked === true)}
          />
          <label
            htmlFor="authorized"
            className="text-sm cursor-pointer leading-relaxed"
          >
            I confirm that I'm authorized to create this company profile and set up
            this organization.
          </label>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={termsCheck}
            onCheckedChange={(checked) => setTermsCheck(checked === true)}
          />
          <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
            I agree to the Terms of Service and Privacy Policy.
          </label>
        </div>
      </div>

    </div>
  );
};
