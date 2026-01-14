import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateIssueFromBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  parentMetricName: string;
  dimensionType: string; // e.g., "Clinician", "Location"
  dimensionLabel: string; // e.g., "Dr. Sarah Chen", "Main Clinic"
  dimensionValue: number;
  unit: string;
  periodLabel: string;
  periodKey: string;
}

export function CreateIssueFromBreakdownModal({
  open,
  onClose,
  organizationId,
  parentMetricName,
  dimensionType,
  dimensionLabel,
  dimensionValue,
  unit,
  periodLabel,
  periodKey,
}: CreateIssueFromBreakdownModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Format value for display
  const formatValue = (value: number): string => {
    if (unit === "dollars" || unit === "$") {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  // Prefill title
  const defaultTitle = `${parentMetricName} - ${dimensionLabel} needs attention`;
  
  // Build description
  const buildDescription = () => {
    const lines = [
      `Period: ${periodLabel}`,
      `${dimensionType}: ${dimensionLabel}`,
      `Current Value: ${formatValue(dimensionValue)}`,
      '',
      'What action should we take to improve this?',
    ];
    return lines.join('\n');
  };

  const [title, setTitle] = useState(defaultTitle);
  const [context, setContext] = useState(buildDescription);
  const [priority, setPriority] = useState('2');
  const [ownerId, setOwnerId] = useState('');
  const [meetingHorizon, setMeetingHorizon] = useState<'weekly' | 'quarterly' | 'annual'>('weekly');

  // Fetch users for owner dropdown
  const { data: users } = useQuery({
    queryKey: ['org-users', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('team_id', organizationId)
        .order('full_name');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .insert({
          organization_id: organizationId,
          title: title.trim(),
          context: context.trim() || null,
          priority: parseInt(priority),
          owner_id: ownerId && ownerId !== "_unassigned" ? ownerId : null,
          status: 'open',
          period_key: periodKey || null,
          meeting_horizon: meetingHorizon,
          created_from: 'breakdown',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue created from breakdown data');
      onClose();
      navigate('/issues');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create issue');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    createIssueMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Create Issue from Breakdown
          </DialogTitle>
          <DialogDescription>
            Create an issue to track and address this {dimensionType.toLowerCase()}'s performance.
          </DialogDescription>
        </DialogHeader>

        {/* Breakdown Summary */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{dimensionLabel}</p>
              <p className="text-xs text-muted-foreground">{parentMetricName} • {periodLabel}</p>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {formatValue(dimensionValue)}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Description</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional details about the issue"
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Critical</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horizon">Meeting Horizon</Label>
            <Select value={meetingHorizon} onValueChange={(v) => setMeetingHorizon(v as 'weekly' | 'quarterly' | 'annual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (L10)</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIssueMutation.isPending}>
              {createIssueMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
