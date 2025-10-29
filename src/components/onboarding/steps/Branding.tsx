import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { BrandingData } from "@/lib/onboarding/validators";
import { Upload } from "lucide-react";
import { useState } from "react";

interface BrandingProps {
  data: Partial<BrandingData>;
  onChange: (data: Partial<BrandingData>) => void;
  errors: Partial<Record<keyof BrandingData, string>>;
}

export const Branding = ({ data, onChange, errors }: BrandingProps) => {
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // TODO: Implement actual upload to Supabase storage
      // For now, just simulate
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onChange({ ...data, logo_url: URL.createObjectURL(file) });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Branding (Optional)</h2>
        <p className="text-muted-foreground">
          Customize the look and feel of your workspace.
        </p>
      </div>

      <Field
        label="Logo"
        help="Upload your clinic logo (PNG, SVG, or WebP)"
        error={errors.logo_url}
      >
        <div className="flex items-center gap-4">
          {data.logo_url && (
            <div className="w-24 h-24 border rounded-lg flex items-center justify-center overflow-hidden">
              <img
                src={data.logo_url}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <label
            htmlFor="logo-upload"
            className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">
              {uploading ? "Uploading..." : "Upload Logo"}
            </span>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </Field>

      <Field
        label="Brand Color"
        help="Primary color for your workspace"
        error={errors.brand_color}
      >
        <div className="flex items-center gap-4">
          <Input
            type="color"
            value={data.brand_color || "#0059FF"}
            onChange={(e) => onChange({ ...data, brand_color: e.target.value })}
            className="w-20 h-12 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={data.brand_color || "#0059FF"}
            onChange={(e) => onChange({ ...data, brand_color: e.target.value })}
            placeholder="#0059FF"
            className="flex-1"
          />
        </div>
      </Field>

      <Field
        label="Website URL"
        help="Your clinic's website"
        error={errors.website_url}
      >
        <Input
          type="url"
          value={data.website_url || ""}
          onChange={(e) => onChange({ ...data, website_url: e.target.value })}
          placeholder="https://yourClinic.com"
        />
      </Field>

      <Field
        label="Default Report Email"
        help="Where to send weekly reports and notifications"
        error={errors.default_report_email}
      >
        <Input
          type="email"
          value={data.default_report_email || ""}
          onChange={(e) =>
            onChange({ ...data, default_report_email: e.target.value })
          }
          placeholder="reports@yourclinic.com"
        />
      </Field>
    </div>
  );
};
