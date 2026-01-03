import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Database, Shield, Eye, EyeOff, Lock, FileText, AlertTriangle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function JaneCompliance() {
  const navigate = useNavigate();

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
              Compliance and Security
            </h1>
            <p className="text-muted-foreground text-lg">
              Technical details for Jane integration partners.
            </p>
          </div>

          {/* Section 1: How Data Flows */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">How Data Flows</h2>
            </div>
            
            {/* Flow Diagram */}
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</div>
                    <div>
                      <p className="font-medium">Jane generates scheduled exports</p>
                      <p className="text-sm text-muted-foreground">CSV files are created on a daily or monthly cadence.</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 border-l-2 border-dashed border-border h-4" />
                  
                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</div>
                    <div>
                      <p className="font-medium">Files are delivered to a dedicated S3 bucket</p>
                      <p className="text-sm text-muted-foreground">Each clinic has an isolated prefix. Files are encrypted in transit and at rest.</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 border-l-2 border-dashed border-border h-4" />
                  
                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</div>
                    <div>
                      <p className="font-medium">Ingestion validates and processes files</p>
                      <p className="text-sm text-muted-foreground">Schema is checked. Prohibited fields are discarded. Account GUID is verified.</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 border-l-2 border-dashed border-border h-4" />
                  
                  {/* Step 4 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">4</div>
                    <div>
                      <p className="font-medium">Data is stored in staging tables</p>
                      <p className="text-sm text-muted-foreground">Raw data is retained for 90 days. Access requires explicit approval.</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 border-l-2 border-dashed border-border h-4" />
                  
                  {/* Step 5 */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">5</div>
                    <div>
                      <p className="font-medium">Aggregated metrics are computed</p>
                      <p className="text-sm text-muted-foreground">Weekly and monthly KPIs are calculated. These are retained indefinitely.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section 2: What We Ingest */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">What We Ingest</h2>
            </div>
            <p className="text-muted-foreground">
              We process the following data types from Jane exports:
            </p>
            <div className="grid gap-3">
              {[
                { name: "Appointments", desc: "Status, duration, practitioner assignment, location. No clinical notes." },
                { name: "Patients", desc: "Anonymized demographics. City, province, postal prefix, referral source. No names or contact info." },
                { name: "Payments", desc: "Amount, date, payment method category, payer type. No card numbers." },
                { name: "Invoices", desc: "Totals, income category, staff assignment. No line-item descriptions." },
                { name: "Shifts", desc: "Scheduled hours, practitioner assignment, location." },
              ].map((item) => (
                <Card key={item.name} className="border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* Section 3: What We Do Not Ingest */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <EyeOff className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-xl font-medium text-foreground">What We Do Not Ingest</h2>
            </div>
            <p className="text-muted-foreground">
              The following data is explicitly excluded or discarded:
            </p>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {[
                    "Patient names, email addresses, phone numbers",
                    "Clinical notes, SOAP notes, treatment records",
                    "Insurance policy numbers or claim details",
                    "Credit card numbers or bank account information",
                    "Practitioner personal contact information",
                    "Any free-text fields that may contain PHI",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-muted-foreground">
                      <EyeOff className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              If a field appears in an export that matches PHI patterns, it is logged and discarded. 
              The data is never stored.
            </p>
          </section>

          <Separator />

          {/* Section 4: Data Isolation Guarantees */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Data Isolation Guarantees</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Each clinic operates in complete isolation.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Unique S3 prefix per organization. No shared paths.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Scoped IAM roles. Each clinic can only access their own bucket path.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Account GUID lock. Files with mismatched GUIDs are rejected.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Row-level security on all database tables. Queries are scoped to the authenticated organization.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>No cross-tenant queries. Aggregations are computed per-organization only.</span>
                </li>
              </ul>
            </div>
          </section>

          <Separator />

          {/* Section 5: Audit and Traceability */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Audit and Traceability</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                All system activity is logged.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>File ingestion is recorded with checksum, row count, and status.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Rejected files are logged with reason and expected vs received values.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Quarantined fields are logged with column name and detection rule.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Data access requires approval and is logged with user, timestamp, and justification.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <span>Data purges are recorded with record count and retention policy applied.</span>
                </li>
              </ul>
              <p className="text-sm">
                Audit logs are retained for a minimum of two years.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 6: Incident Response */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Incident Response</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                In the event of a security incident:
              </p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Affected connectors are immediately disabled.</li>
                <li>Impacted organizations are notified within 24 hours.</li>
                <li>A root cause analysis is conducted and documented.</li>
                <li>Remediation steps are implemented and verified.</li>
                <li>A post-incident report is provided to affected parties.</li>
              </ol>
              <p className="text-sm">
                We maintain an incident response plan reviewed annually.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 7: Contact */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Security Questions</h2>
            </div>
            <Card className="border-border/50">
              <CardContent className="py-6">
                <p className="text-muted-foreground mb-4">
                  For security-related questions or to report a concern:
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">security@clinicleader.com</p>
                </div>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">
                  We respond to security inquiries within one business day.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Last updated: January 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
