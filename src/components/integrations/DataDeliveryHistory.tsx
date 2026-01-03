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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LedgerEntry {
  id: string;
  timestamp: string;
  source_system: string;
  resource_type: string;
  file_name: string | null;
  file_date: string | null;
  rows_received: number;
  rows_ingested: number;
  rows_dropped: number;
  fields_quarantined: number;
  checksum: string | null;
  status: "accepted" | "rejected" | "partial";
  rejection_reason: string | null;
  processing_duration_ms: number | null;
  account_guid_verified: boolean;
  data_minimization_applied: boolean;
}

interface DataDeliveryHistoryProps {
  organizationId: string;
}

const PAGE_SIZE = 10;

export default function DataDeliveryHistory({ organizationId }: DataDeliveryHistoryProps) {
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const { data: ledgerEntries, isLoading } = useQuery({
    queryKey: ["data-ingestion-ledger", organizationId, resourceFilter, statusFilter, dateRange, page],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from("data_ingestion_ledger")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("timestamp", startDate.toISOString())
        .order("timestamp", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (resourceFilter !== "all") {
        query = query.eq("resource_type", resourceFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LedgerEntry[];
    },
    enabled: !!organizationId,
  });

  const { data: totalCount } = useQuery({
    queryKey: ["data-ingestion-ledger-count", organizationId, resourceFilter, statusFilter, dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from("data_ingestion_ledger")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("timestamp", startDate.toISOString());

      if (resourceFilter !== "all") {
        query = query.eq("resource_type", resourceFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Data Delivery History
              </CardTitle>
              <CardDescription className="mt-1">
                Immutable audit trail of all data ingestion attempts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              Read-only audit log
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="appointments">Appointments</SelectItem>
                <SelectItem value="patients">Patients</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="shifts">Shifts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : ledgerEntries && ledgerEntries.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Dropped</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow 
                      key={entry.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(entry.timestamp), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="capitalize">{entry.resource_type}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.rows_ingested.toLocaleString()}/{entry.rows_received.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.rows_dropped > 0 ? (
                          <span className="text-amber-600 font-medium">{entry.rows_dropped}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.account_guid_verified ? (
                          <Shield className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center border rounded-lg border-dashed">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No delivery records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Records will appear here after data is received
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount || 0)} of {totalCount} entries
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ingestion Details
            </DialogTitle>
            <DialogDescription>
              Audit record for {selectedEntry?.resource_type} delivery
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                  <p className="font-medium text-sm">
                    {format(new Date(selectedEntry.timestamp), "PPpp")}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(selectedEntry.status)}
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <p className="font-medium text-sm">{selectedEntry.source_system}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Resource</p>
                  <p className="font-medium text-sm capitalize">{selectedEntry.resource_type}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <h4 className="text-sm font-medium mb-3">Data Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{selectedEntry.rows_received}</p>
                    <p className="text-xs text-muted-foreground">Rows Received</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedEntry.rows_ingested}</p>
                    <p className="text-xs text-muted-foreground">Rows Ingested</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{selectedEntry.rows_dropped}</p>
                    <p className="text-xs text-muted-foreground">Rows Dropped</p>
                  </div>
                </div>
                {selectedEntry.fields_quarantined > 0 && (
                  <p className="text-sm text-amber-600 mt-3 text-center">
                    {selectedEntry.fields_quarantined} field(s) quarantined for PHI protection
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Processing Time</p>
                  <p className="font-medium text-sm">{formatDuration(selectedEntry.processing_duration_ms)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">File Date</p>
                  <p className="font-medium text-sm">
                    {selectedEntry.file_date ? format(new Date(selectedEntry.file_date), "PP") : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  {selectedEntry.account_guid_verified ? (
                    <Shield className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Account {selectedEntry.account_guid_verified ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEntry.data_minimization_applied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">Data Minimization</span>
                </div>
              </div>

              {selectedEntry.rejection_reason && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                  <p className="text-xs text-red-600 font-medium mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700">{selectedEntry.rejection_reason}</p>
                </div>
              )}

              {selectedEntry.checksum && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Checksum</p>
                  <p className="font-mono text-xs truncate">{selectedEntry.checksum}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}