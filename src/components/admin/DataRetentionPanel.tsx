import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Trash2, Shield, Database, Calendar, AlertCircle, CheckCircle, Info, FileText, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Default retention policies for display
const DEFAULT_POLICIES = [
  {
    resource_type: "staging_appointments_jane",
    display_name: "Appointment Records (Staging)",
    retention_days: 90,
    is_purgeable: true,
    category: "staging",
    description: "Raw appointment data from Jane. Auto-purged after retention period."
  },
  {
    resource_type: "staging_patients_jane",
    display_name: "Patient Records (Staging)",
    retention_days: 90,
    is_purgeable: true,
    category: "staging",
    description: "Anonymized patient demographics. Auto-purged after retention period."
  },
  {
    resource_type: "staging_payments_jane",
    display_name: "Payment Records (Staging)",
    retention_days: 90,
    is_purgeable: true,
    category: "staging",
    description: "Payment transaction data. Auto-purged after retention period."
  },
  {
    resource_type: "staging_invoices_jane",
    display_name: "Invoice Records (Staging)",
    retention_days: 90,
    is_purgeable: true,
    category: "staging",
    description: "Invoice and billing data. Auto-purged after retention period."
  },
  {
    resource_type: "staging_shifts_jane",
    display_name: "Shift Records (Staging)",
    retention_days: 90,
    is_purgeable: true,
    category: "staging",
    description: "Staff scheduling data. Auto-purged after retention period."
  },
  {
    resource_type: "metric_results",
    display_name: "Aggregated Metrics",
    retention_days: -1,
    is_purgeable: false,
    category: "aggregated",
    description: "Weekly/monthly aggregated KPIs. Retained indefinitely for trend analysis."
  },
  {
    resource_type: "data_access_audit",
    display_name: "Access Audit Logs",
    retention_days: 730,
    is_purgeable: false,
    category: "audit",
    description: "Who accessed what data and when. Retained for compliance."
  },
  {
    resource_type: "data_purge_log",
    display_name: "Purge History",
    retention_days: -1,
    is_purgeable: false,
    category: "audit",
    description: "Record of all data deletions. Retained indefinitely for audit."
  },
];

interface DeletionRequest {
  id: string;
  resource_type: string;
  justification: string;
  status: string;
  created_at: string;
  date_range_start: string | null;
  date_range_end: string | null;
  reviewed_at: string | null;
  records_deleted: number | null;
}

interface PurgeLogEntry {
  id: string;
  resource_type: string;
  records_purged: number;
  retention_days_applied: number;
  purge_type: string;
  executed_at: string;
  status: string;
}

export function DataRetentionPanel() {
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState("");
  const [justification, setJustification] = useState("");

  // Fetch current user's org
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-for-retention'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('id', user.id)
        .single();
      
      return data;
    },
  });

  // Fetch deletion requests
  const { data: deletionRequests } = useQuery({
    queryKey: ['deletion-requests', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data, error } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('organization_id', currentUser.team_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as DeletionRequest[];
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch purge history
  const { data: purgeHistory } = useQuery({
    queryKey: ['purge-history', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data, error } = await supabase
        .from('data_purge_log')
        .select('*')
        .eq('organization_id', currentUser.team_id)
        .order('executed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as PurgeLogEntry[];
    },
    enabled: !!currentUser?.team_id,
  });

  // Submit deletion request mutation
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !currentUser?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('data_deletion_requests')
        .insert({
          organization_id: currentUser.team_id,
          requested_by: currentUser.id,
          resource_type: selectedResourceType,
          justification,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Deletion request submitted for review');
      setIsRequestDialogOpen(false);
      setSelectedResourceType("");
      setJustification("");
      queryClient.invalidateQueries({ queryKey: ['deletion-requests'] });
    },
    onError: (error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'executed':
        return <Badge className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Executed</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'staging':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Staging Data</Badge>;
      case 'aggregated':
        return <Badge variant="outline" className="text-green-600 border-green-300">Aggregated</Badge>;
      case 'audit':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Audit Trail</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const purgeableResources = DEFAULT_POLICIES.filter(p => p.is_purgeable);

  return (
    <div className="space-y-6">
      {/* Retention Policy Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Data Retention Policies</CardTitle>
          </div>
          <CardDescription>
            How long different types of data are retained before automatic deletion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Information Banner */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">How Data Retention Works</p>
                  <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• <strong>Staging data</strong> (raw imports) is automatically purged after 90 days</li>
                    <li>• <strong>Aggregated metrics</strong> are retained indefinitely for trend analysis</li>
                    <li>• <strong>Audit logs</strong> are kept for compliance verification</li>
                    <li>• Scheduled purge jobs run daily to enforce these policies</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Policy List */}
            <div className="space-y-3">
              {DEFAULT_POLICIES.map((policy) => (
                <div key={policy.resource_type} className="flex items-start justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{policy.display_name}</span>
                      {getCategoryBadge(policy.category)}
                    </div>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {policy.retention_days === -1 ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Indefinite
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {policy.retention_days} days
                      </Badge>
                    )}
                    {!policy.is_purgeable && (
                      <p className="text-xs text-muted-foreground mt-1">Cannot be deleted</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Deletion Request */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle>Manual Deletion Requests</CardTitle>
            </div>
            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Request Deletion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Data Deletion</DialogTitle>
                  <DialogDescription>
                    Submit a request to manually delete staging data. This requires admin approval and will be logged for audit purposes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Type</label>
                    <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type to delete" />
                      </SelectTrigger>
                      <SelectContent>
                        {purgeableResources.map((resource) => (
                          <SelectItem key={resource.resource_type} value={resource.resource_type}>
                            {resource.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Justification</label>
                    <Textarea
                      placeholder="Explain why this data needs to be deleted early..."
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be recorded in the audit log.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => submitRequest.mutate()}
                    disabled={!selectedResourceType || !justification.trim() || submitRequest.isPending}
                  >
                    {submitRequest.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Request early deletion of staging data with documented justification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletionRequests && deletionRequests.length > 0 ? (
            <div className="space-y-3">
              {deletionRequests.map((request) => (
                <div key={request.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {DEFAULT_POLICIES.find(p => p.resource_type === request.resource_type)?.display_name || request.resource_type}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{request.justification}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(request.created_at), 'MMM d, yyyy')}
                      {request.records_deleted && ` • ${request.records_deleted} records deleted`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deletion requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purge History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Purge History</CardTitle>
          </div>
          <CardDescription>
            Record of automatic and manual data purges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purgeHistory && purgeHistory.length > 0 ? (
            <div className="space-y-2">
              {purgeHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${entry.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {entry.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {DEFAULT_POLICIES.find(p => p.resource_type === entry.resource_type)?.display_name || entry.resource_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.executed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{entry.records_purged.toLocaleString()} records</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.purge_type === 'scheduled' ? 'Scheduled' : 'Manual'} • {entry.retention_days_applied}d retention
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No purge history yet</p>
              <p className="text-xs mt-1">Automatic purges run daily</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
