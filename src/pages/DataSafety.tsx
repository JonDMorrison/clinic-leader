import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataAccessAuditPanel } from "@/components/admin/DataAccessAuditPanel";
import { SecurityOverviewPanel } from "@/components/admin/SecurityOverviewPanel";
import { DataRetentionPanel } from "@/components/admin/DataRetentionPanel";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function DataSafety() {
  const navigate = useNavigate();
  const { data: adminData } = useIsAdmin();
  const isAdmin = adminData?.isAdmin ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-3">
              Security, Compliance, and Data Access
            </h1>
            <p className="text-muted-foreground text-lg">
              How ClinicLeader safely connects to external systems for analytics and reporting.
            </p>
          </div>

          {/* Section 1: What This Connection Is */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">What This Connection Is</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              ClinicLeader receives scheduled, read-only data from your practice management system. 
              This data is used exclusively for analytics and leadership reporting. There is no 
              live interaction with your clinical systems.
            </p>
          </section>

          {/* Section 2: How Data Is Transferred */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">How Data Is Transferred</h2>
            </div>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                Data arrives through secure, scheduled delivery on a predictable cadence—either 
                daily or monthly depending on your configuration.
              </p>
              <p>
                The data follows a structured format designed specifically for reporting purposes, 
                ensuring consistency and reliability.
              </p>
            </div>
          </section>

          {/* Section 3: What Data Is Used For */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">What Data Is Used For</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Your data powers operational insights for leadership teams:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>Scorecards that track key performance metrics</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>Trends over time to identify patterns and opportunities</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>Accountability metrics for team alignment</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>Leadership visibility into practice health</span>
              </li>
            </ul>
          </section>

          {/* Section 4: What We Do Not Do */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-xl font-medium text-foreground">What We Do Not Do</h2>
            </div>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {[
                    "Modify patient records",
                    "Schedule or cancel appointments",
                    "Message patients",
                    "Change billing or payments",
                    "Share or sell data to third parties",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-muted-foreground">
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Section 5: Security & Encryption Overview */}
          <section className="space-y-4">
            <SecurityOverviewPanel />
          </section>

          {/* Section 6: Control & Transparency */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Control and Transparency</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                You remain in control. The data connection can be disabled at any time from 
                your settings.
              </p>
              <p>
                When disabled, data delivery stops immediately. There is no disruption to 
                your practice management system.
              </p>
            </div>
          </section>

          {/* Section 7: Designed for Leadership */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium text-foreground">Designed for Leadership</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                This integration is built for leadership teams who need visibility into 
                practice performance. It aligns with structured operating systems like EOS 
                and supports weekly reviews, quarterly planning, and long-term goal tracking.
              </p>
              <p>
                It is not intended for front desk workflows or clinical task execution.
              </p>
            </div>
          </section>

          {/* Section 8: Data Retention & Lifecycle */}
          <section className="space-y-4 border-t pt-8">
            <h2 className="text-xl font-medium text-foreground">Data Retention & Lifecycle</h2>
            <p className="text-muted-foreground mb-6">
              How long data is retained and what can be deleted. Staging data is automatically 
              purged after the retention period. Aggregated metrics are kept indefinitely.
            </p>
            <DataRetentionPanel />
          </section>

          {/* Section 9: Zero Standing Access (Admin Only) */}
          {isAdmin && (
            <section className="space-y-4 border-t pt-8">
              <h2 className="text-xl font-medium text-foreground">Data Access Controls</h2>
              <p className="text-muted-foreground mb-6">
                Manage temporary access requests for raw staging data. All access requires 
                explicit approval, justification, and is time-limited.
              </p>
              <DataAccessAuditPanel />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
