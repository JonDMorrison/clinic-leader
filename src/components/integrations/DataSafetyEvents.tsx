import { useState } from "react";
import { format, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldAlert,
  Filter,
  ChevronLeft,
  ChevronRight,
  Ban,
  Info,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QuarantinedField {
  id: string;
  file_name: string;
  resource_name: string;
  field_name: string;
  field_value_preview: string | null;
  detection_method: string;
  severity: string;
  action_taken: string;
  created_at: string;
}

interface DataSafetyEventsProps {
  organizationId: string;
}

// Human-readable explanations for why fields are rejected
const REJECTION_REASONS: Record<string, { title: string; explanation: string }> = {
  // Field name based
  patient_name: { title: "Patient Name", explanation: "Names are personally identifiable information (PII) and cannot be stored for privacy protection." },
  first_name: { title: "First Name", explanation: "Names are personally identifiable information (PII) and cannot be stored for privacy protection." },
  last_name: { title: "Last Name", explanation: "Names are personally identifiable information (PII) and cannot be stored for privacy protection." },
  email: { title: "Email Address", explanation: "Email addresses are direct identifiers and could be used to identify individuals." },
  phone: { title: "Phone Number", explanation: "Phone numbers are direct identifiers and cannot be stored." },
  dob: { title: "Date of Birth", explanation: "Date of birth combined with other data could identify individuals." },
  address: { title: "Address", explanation: "Physical addresses are personally identifiable information." },
  ssn: { title: "Social Security Number", explanation: "SSN is highly sensitive PII and must never be stored." },
  notes: { title: "Clinical Notes", explanation: "Free-text notes may contain protected health information (PHI)." },
  clinical_notes: { title: "Clinical Notes", explanation: "Clinical documentation contains protected health information." },
  
  // Detection method based
  prohibited_list: { title: "Prohibited Field", explanation: "This field is on our explicit block list to prevent PHI storage." },
  phi_pattern: { title: "PHI Pattern Detected", explanation: "The data matched patterns commonly associated with personal information." },
  unknown_column: { title: "Unknown Column", explanation: "Unrecognized columns are dropped by default to prevent accidental PHI storage." },
};

const getExplanation = (fieldName: string, detectionMethod: string): { title: string; explanation: string } => {
  // Check field name first
  const lowerField = fieldName.toLowerCase();
  for (const [key, value] of Object.entries(REJECTION_REASONS)) {
    if (lowerField.includes(key)) {
      return value;
    }
  }
  // Fall back to detection method
  return REJECTION_REASONS[detectionMethod] || {
    title: "Data Safety Rule",
    explanation: "This field was discarded to protect patient privacy and ensure compliance."
  };
};

const PAGE_SIZE = 15;

export default function DataSafetyEvents({ organizationId }: DataSafetyEventsProps) {
  const [dateRange, setDateRange] = useState<string>("30");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data: events, isLoading } = useQuery({
    queryKey: ["quarantined-fields", organizationId, dateRange, severityFilter, page],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from("quarantined_fields_log")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QuarantinedField[];
    },
    enabled: !!organizationId,
  });

  const { data: stats } = useQuery({
    queryKey: ["quarantined-fields-stats", organizationId, dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      const { data, error } = await supabase
        .from("quarantined_fields_log")
        .select("severity, detection_method")
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;
      
      const critical = (data || []).filter(d => d.severity === "critical").length;
      const warning = (data || []).filter(d => d.severity === "warning").length;
      const total = (data || []).length;
      
      return { total, critical, warning };
    },
    enabled: !!organizationId,
  });

  const { data: totalCount } = useQuery({
    queryKey: ["quarantined-fields-count", organizationId, dateRange, severityFilter],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from("quarantined_fields_log")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", startDate.toISOString());

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  const getSeverityBadge = (severity: string) => {
    if (severity === "critical") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <ShieldAlert className="w-3 h-3 mr-1" />
          Critical
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Warning
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Data Safety Events
            </CardTitle>
            <CardDescription className="mt-1">
              Fields automatically discarded to protect patient privacy
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <EyeOff className="w-3 h-3" />
            PHI never stored
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Fields Blocked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Critical PHI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
              <p className="text-xs text-muted-foreground">Unknown Fields</p>
            </div>
          </div>
        )}

        {/* How It Works */}
        <Accordion type="single" collapsible className="border rounded-lg">
          <AccordionItem value="how-it-works" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-primary" />
                How does data safety work?
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  ClinicLeader automatically protects patient privacy by detecting and discarding 
                  sensitive information before it enters our system. Here's how:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Column Name Detection:</strong> Fields like "patient_name", "email", or "phone" are automatically blocked</li>
                  <li><strong>Pattern Matching:</strong> Data that looks like email addresses, phone numbers, or SSNs is detected and discarded</li>
                  <li><strong>Whitelist Approach:</strong> Only explicitly approved fields are stored; unknown columns are dropped by default</li>
                  <li><strong>Never Stored:</strong> Blocked data is never written to our database—only the detection event is logged</li>
                </ul>
                <p className="pt-2 text-xs">
                  This log shows what was blocked, not what the data contained. Your patient information remains private.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="warning">Warnings Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Detected</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const explanation = getExplanation(event.field_name, event.detection_method);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {format(new Date(event.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {event.field_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{explanation.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {explanation.explanation}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Ban className="w-3 h-3 mr-1" />
                          Discarded
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center border rounded-lg border-dashed">
            <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-muted-foreground">No safety events in this period</p>
            <p className="text-sm text-muted-foreground mt-1">
              This means incoming data hasn't contained blocked fields
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount || 0)} of {totalCount} events
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Privacy Assurance Footer */}
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50/50 border-green-200">
          <Eye className="w-4 h-4 text-green-600" />
          <p className="text-xs text-green-700">
            <strong>Privacy Guarantee:</strong> Blocked data is never stored. Only the field name and detection event are logged for compliance auditing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}