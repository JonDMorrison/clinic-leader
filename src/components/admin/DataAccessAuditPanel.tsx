import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  History,
  Lock,
  FileText,
  User,
  Calendar,
  Loader2,
} from "lucide-react";

interface AccessRequest {
  id: string;
  user_id: string;
  organization_id: string;
  resource_type: string;
  justification: string;
  status: string;
  requested_at: string;
  expires_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

interface AuditEntry {
  id: string;
  user_id: string;
  user_email: string;
  organization_id: string;
  resource_type: string;
  action: string;
  row_count: number | null;
  justification: string | null;
  accessed_at: string;
  access_request_id: string | null;
}

const RESOURCE_LABELS: Record<string, string> = {
  staging_appointments_jane: "Appointments Data",
  staging_patients_jane: "Patients Data",
  staging_payments_jane: "Payments Data",
  staging_invoices_jane: "Invoices Data",
  staging_shifts_jane: "Shifts Data",
};

const STATUS_CONFIG: Record<string, { color: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { color: "secondary", icon: Clock },
  approved: { color: "default", icon: CheckCircle2 },
  denied: { color: "destructive", icon: XCircle },
  expired: { color: "outline", icon: AlertTriangle },
  revoked: { color: "destructive", icon: Lock },
};

export function DataAccessAuditPanel() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approveHours, setApproveHours] = useState("4");

  const orgId = currentUser?.team_id;

  // Fetch pending access requests
  const { data: accessRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["data-access-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("data_access_requests")
        .select("*")
        .eq("organization_id", orgId)
        .order("requested_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AccessRequest[];
    },
    enabled: !!orgId,
  });

  // Fetch audit log
  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["data-access-audit", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("data_access_audit")
        .select("*")
        .eq("organization_id", orgId)
        .order("accessed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!orgId,
  });

  // Approve request mutation
  const approveRequest = useMutation({
    mutationFn: async ({ requestId, hours }: { requestId: string; hours: number }) => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      const { error } = await supabase
        .from("data_access_requests")
        .update({
          status: "approved",
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access request approved");
      queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Deny request mutation
  const denyRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("data_access_requests")
        .update({
          status: "denied",
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access request denied");
      queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to deny: ${error.message}`);
    },
  });

  // Revoke active access
  const revokeAccess = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("data_access_requests")
        .update({ status: "revoked" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Access revoked");
      queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke: ${error.message}`);
    },
  });

  const pendingRequests = accessRequests?.filter(r => r.status === "pending") || [];
  const activeRequests = accessRequests?.filter(r => r.status === "approved" && new Date(r.expires_at) > new Date()) || [];
  const historicalRequests = accessRequests?.filter(r => 
    r.status !== "pending" && !(r.status === "approved" && new Date(r.expires_at) > new Date())
  ) || [];

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || { color: "outline", icon: AlertTriangle };
    const Icon = config.icon;
    return (
      <Badge variant={config.color} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-amber-600" />
            Zero Standing Access Control
          </CardTitle>
          <CardDescription>
            All raw data access requires explicit approval, justification, and is time-limited. 
            No user can view staging data without an active, approved request.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Active ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Pending Requests */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Access Requests</CardTitle>
              <CardDescription>Review and approve or deny data access requests</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending access requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Justification</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {RESOURCE_LABELS[request.resource_type] || request.resource_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="truncate text-sm text-muted-foreground">
                                {request.justification}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>{request.justification}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog open={isApproveDialogOpen && selectedRequest?.id === request.id} onOpenChange={(open) => {
                              setIsApproveDialogOpen(open);
                              if (!open) setSelectedRequest(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Approve Access Request</DialogTitle>
                                  <DialogDescription>
                                    Set the duration for this temporary access grant.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                                    <p className="text-sm font-medium">
                                      {RESOURCE_LABELS[request.resource_type] || request.resource_type}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      "{request.justification}"
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Access Duration</Label>
                                    <Select value={approveHours} onValueChange={setApproveHours}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 hour</SelectItem>
                                        <SelectItem value="4">4 hours</SelectItem>
                                        <SelectItem value="8">8 hours</SelectItem>
                                        <SelectItem value="24">24 hours</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      Access will automatically expire after this duration.
                                    </p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => approveRequest.mutate({ 
                                      requestId: request.id, 
                                      hours: parseInt(approveHours) 
                                    })}
                                    disabled={approveRequest.isPending}
                                  >
                                    {approveRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Grant Access
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => denyRequest.mutate(request.id)}
                              disabled={denyRequest.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Access */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Access Grants</CardTitle>
              <CardDescription>Currently approved, non-expired access grants</CardDescription>
            </CardHeader>
            <CardContent>
              {activeRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active access grants</p>
                  <p className="text-xs mt-1">All raw data is currently locked</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Justification</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {RESOURCE_LABELS[request.resource_type] || request.resource_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm text-muted-foreground">
                            {request.justification}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-amber-600 font-medium">
                              {formatDistanceToNow(new Date(request.expires_at), { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeAccess.mutate(request.id)}
                            disabled={revokeAccess.isPending}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Access Audit Log</CardTitle>
              <CardDescription>Immutable record of all data access events</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !auditLog || auditLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No access events recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead>Justification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono">{entry.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {RESOURCE_LABELS[entry.resource_type] || entry.resource_type}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.row_count ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.accessed_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-xs text-muted-foreground">
                            {entry.justification || "—"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Historical Requests */}
          {historicalRequests.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Request History</CardTitle>
                <CardDescription>Expired, denied, and revoked access requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Justification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalRequests.slice(0, 20).map((request) => (
                      <TableRow key={request.id} className="opacity-75">
                        <TableCell className="text-sm">
                          {RESOURCE_LABELS[request.resource_type] || request.resource_type}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(request.requested_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-xs text-muted-foreground">
                            {request.justification}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
