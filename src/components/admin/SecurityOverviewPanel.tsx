import { Shield, Lock, Key, Server, Cloud, Clock, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SecuritySection {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  status?: "active" | "configured";
}

const securitySections: SecuritySection[] = [
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Encryption at Rest",
    description: "All stored data is encrypted using industry-standard algorithms.",
    details: [
      "Database uses AES-256 encryption for all stored records",
      "File storage buckets are encrypted with server-side encryption",
      "Backup snapshots are encrypted with separate keys",
      "Encryption keys are managed by the cloud provider's KMS"
    ],
    status: "active"
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Encryption in Transit",
    description: "All data moving between systems is protected during transmission.",
    details: [
      "TLS 1.3 for all API and web traffic (HTTPS only)",
      "Database connections use SSL/TLS encryption",
      "Internal service-to-service calls are encrypted",
      "S3 transfers use HTTPS with signed requests"
    ],
    status: "active"
  },
  {
    icon: <Key className="h-5 w-5" />,
    title: "Secrets Storage",
    description: "Sensitive credentials are stored securely, never in code.",
    details: [
      "API keys stored in encrypted vault, not in source code",
      "Secrets are injected at runtime via secure environment",
      "Database passwords use rotating credentials",
      "No secrets are logged or exposed in error messages"
    ],
    status: "configured"
  },
  {
    icon: <Server className="h-5 w-5" />,
    title: "Credential Location",
    description: "Where your credentials live and how they're protected.",
    details: [
      "Environment variables: Stored in secure runtime config",
      "Vault storage: Long-term secrets in encrypted vault",
      "Session tokens: Short-lived, auto-expiring credentials",
      "Service accounts: Scoped to minimum required permissions"
    ],
    status: "configured"
  },
  {
    icon: <Cloud className="h-5 w-5" />,
    title: "S3 IAM Role Scoping",
    description: "Each clinic has isolated, least-privilege access to their data.",
    details: [
      "Each organization gets a unique IAM role ARN",
      "Roles are scoped to specific S3 bucket prefixes only",
      "Cross-account access uses external ID verification",
      "No clinic can access another clinic's data path"
    ],
    status: "active"
  }
];

export function SecurityOverviewPanel() {
  // In a real implementation, this would come from an API
  const lastRotation = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
  const daysSinceRotation = Math.floor((Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24));
  const rotationStatus = daysSinceRotation < 30 ? "healthy" : daysSinceRotation < 60 ? "warning" : "critical";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security & Encryption Overview</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>This panel provides a plain-language overview of how your data is protected. No configuration is required here.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          How your data is protected at every layer of the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credential Rotation Status */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Last Credential Rotation</p>
                <p className="text-sm text-muted-foreground">
                  {lastRotation.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <Badge 
              variant={rotationStatus === "healthy" ? "default" : rotationStatus === "warning" ? "secondary" : "destructive"}
              className="flex items-center gap-1"
            >
              {rotationStatus === "healthy" && <CheckCircle className="h-3 w-3" />}
              {daysSinceRotation} days ago
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Credentials are automatically rotated every 90 days. Manual rotation can be triggered by administrators.
          </p>
        </div>

        <Separator />

        {/* Security Sections */}
        <div className="space-y-4">
          {securitySections.map((section, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-primary">{section.icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{section.title}</h4>
                      {section.status && (
                        <Badge variant="outline" className="text-xs">
                          {section.status === "active" ? "Active" : "Configured"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </div>
              <ul className="mt-3 ml-8 space-y-1">
                {section.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Compliance Note</p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                These security controls are designed to meet healthcare data protection requirements. 
                All encryption and access controls are enforced automatically—no manual configuration is needed.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
