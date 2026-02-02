/**
 * CreateIssueFromLegacyModal
 * 
 * Modal to create an issue from a legacy workbook row.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface CreateIssueFromLegacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowLabel: string;
  sectionTitle: string;
  rowData: any[];
  periodKey: string;
  organizationId?: string;
}

export function CreateIssueFromLegacyModal({
  open,
  onOpenChange,
  rowLabel,
  sectionTitle,
  rowData,
  periodKey,
  organizationId,
}: CreateIssueFromLegacyModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const orgId = organizationId || currentUser?.team_id;
  
  // Format period for display
  const formatPeriod = (key: string) => {
    try {
      return format(parseISO(`${key}-01`), "MMMM yyyy");
    } catch {
      return key;
    }
  };
  
  const defaultTitle = `${rowLabel} - needs attention`;
  const defaultContext = `Source: ${sectionTitle}\nPeriod: ${formatPeriod(periodKey)}\n\nData: ${rowData.slice(0, 5).filter(v => v != null && String(v).trim() !== '').join(', ')}\n\nWhat action is needed?`;
  
  const [title, setTitle] = useState(defaultTitle);
  const [context, setContext] = useState(defaultContext);
  const [priority, setPriority] = useState('2');
  const [ownerId, setOwnerId] = useState('');

  const { data: users } = useQuery({
    queryKey: ['org-users', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('team_id', orgId)
        .order('full_name');
      return data || [];
    },
    enabled: !!orgId && open,
  });

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      
      const { data, error } = await supabase
        .from('issues')
        .insert({
          organization_id: orgId,
          title: title.trim(),
          context: context.trim() || null,
          priority: parseInt(priority),
          owner_id: ownerId && ownerId !== "_unassigned" ? ownerId : null,
          status: 'open',
          period_key: periodKey || null,
          meeting_horizon: 'weekly',
          created_from: 'breakdown', // Using breakdown since it's from data
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue created from data row');
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Create Issue
          </DialogTitle>
          <DialogDescription>
            Create an issue to track and resolve a problem with this data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border text-sm">
            <p className="font-medium">{rowLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{sectionTitle} • {formatPeriod(periodKey)}</p>
          </div>

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
              placeholder="Additional details"
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
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

          <DialogFooter className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIssueMutation.isPending}>
              {createIssueMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
