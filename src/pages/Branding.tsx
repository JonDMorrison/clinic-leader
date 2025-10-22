import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Image, Type, Globe } from "lucide-react";
import type { Branding, BrandingUpdate } from "@/types/branding";

const Branding = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<BrandingUpdate>({
    logo_url: null,
    primary_color: "215 50% 50%",
    secondary_color: "215 25% 96%",
    accent_color: "215 50% 95%",
    font_family: "Inter",
    favicon_url: null,
    subdomain: null,
    custom_domain: null,
  });

  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branding")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as Branding | null;
    },
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        logo_url: branding.logo_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        font_family: branding.font_family,
        favicon_url: branding.favicon_url,
        subdomain: branding.subdomain,
        custom_domain: branding.custom_domain,
      });
    }
  }, [branding]);

  const updateBranding = useMutation({
    mutationFn: async (updates: BrandingUpdate) => {
      if (branding?.id) {
        const { error } = await supabase
          .from("branding")
          .update(updates)
          .eq("id", branding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("branding")
          .insert({ ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast({
        title: "Success",
        description: "Branding updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8">Loading branding settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Branding</h1>
        <p className="text-muted-foreground">
          Customize your organization's visual identity
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo & Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logos & Icons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, logo_url: e.target.value || null })
                }
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input
                id="favicon_url"
                type="url"
                value={formData.favicon_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, favicon_url: e.target.value || null })
                }
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Palette (HSL Format)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <Input
                id="primary_color"
                value={formData.primary_color}
                onChange={(e) =>
                  setFormData({ ...formData, primary_color: e.target.value })
                }
                placeholder="215 50% 50%"
              />
              <p className="text-xs text-muted-foreground mt-1">
                HSL format: hue saturation% lightness%
              </p>
            </div>
            <div>
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <Input
                id="secondary_color"
                value={formData.secondary_color}
                onChange={(e) =>
                  setFormData({ ...formData, secondary_color: e.target.value })
                }
                placeholder="215 25% 96%"
              />
            </div>
            <div>
              <Label htmlFor="accent_color">Accent Color</Label>
              <Input
                id="accent_color"
                value={formData.accent_color}
                onChange={(e) =>
                  setFormData({ ...formData, accent_color: e.target.value })
                }
                placeholder="215 50% 95%"
              />
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="font_family">Font Family</Label>
              <Input
                id="font_family"
                value={formData.font_family}
                onChange={(e) =>
                  setFormData({ ...formData, font_family: e.target.value })
                }
                placeholder="Inter"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use Google Fonts name
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Domain Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Domain Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={formData.subdomain || ""}
                onChange={(e) =>
                  setFormData({ ...formData, subdomain: e.target.value || null })
                }
                placeholder="your-clinic"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will be accessible at your-clinic.app.com
              </p>
            </div>
            <div>
              <Label htmlFor="custom_domain">Custom Domain</Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    custom_domain: e.target.value || null,
                  })
                }
                placeholder="portal.yourcompany.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Configure DNS CNAME to point to your app
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={updateBranding.isPending}>
          {updateBranding.isPending ? "Saving..." : "Save Branding"}
        </Button>
      </form>
    </div>
  );
};

export default Branding;
