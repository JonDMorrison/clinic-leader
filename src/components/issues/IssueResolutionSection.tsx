import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, User, Calendar, Pencil, Check, X, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { format } from "date-fns";
import { Link } from "react-router-dom";

type ResolutionType = 'intervention_created' | 'no_intervention_needed' | 'defer' | 'unknown';

interface IssueResolutionSectionProps {
  issue: {
    id: string;
    organization_id: string;
    resolution_type?: ResolutionType | null;
    resolution_note?: string | null;
    resolved_at?: string | null;
    resolved_by?: string | null;
    linked_intervention_id?: string | null;
  };
  onUpdate: () => void;
}

export const IssueResolutionSection = ({ issue, onUpdate }: IssueResolutionSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editResolutionType, setEditResolutionType] = useState<ResolutionType | null>(issue.resolution_type || null);
  const [editNote, setEditNote] = useState(issue.resolution_note || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: adminData } = useIsAdmin();

  // Fetch resolver user info
  const { data: resolver } = useQuery({
    queryKey: ["user", issue.resolved_by],
    queryFn: async () => {
      if (!issue.resolved_by) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("id", issue.resolved_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!issue.resolved_by,
  });

  // Fetch linked intervention info
  const { data: linkedIntervention } = useQuery({
    queryKey: ["intervention", issue.linked_intervention_id],
    queryFn: async () => {
      if (!issue.linked_intervention_id) return null;
      const { data, error } = await supabase
        .from("interventions")
        .select("id, title, status")
        .eq("id", issue.linked_intervention_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!issue.linked_intervention_id,
  });

  const getResolutionLabel = (type: ResolutionType | null) => {
    switch (type) {
      case 'intervention_created': return 'Intervention Created';
      case 'no_intervention_needed': return 'No Intervention Needed';
      case 'defer': return 'Deferred';
      case 'unknown': return 'Unknown';
      default: return 'Not specified';
    }
  };

  const getResolutionVariant = (type: ResolutionType | null): "success" | "muted" | "warning" | "brand" => {
    switch (type) {
      case 'intervention_created': return 'success';
      case 'no_intervention_needed': return 'muted';
      case 'defer': return 'warning';
      default: return 'muted';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("issues")
        .update({
          resolution_type: editResolutionType,
          resolution_note: editNote || null,
        })
        .eq("id", issue.id);

      if (updateError) throw updateError;

      // Log the update event
      await supabase
        .from("issue_resolution_events")
        .insert({
          organization_id: issue.organization_id,
          issue_id: issue.id,
          event_type: "resolution_updated",
          resolution_type: editResolutionType,
          note: editNote || null,
          created_by: user.id,
        });

      toast({
        title: "Resolution updated",
        description: "The resolution details have been saved.",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!issue.resolved_at && !issue.resolution_type) {
    return null;
  }

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Resolution</span>
        {adminData?.isAdmin && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Select
            value={editResolutionType || "unknown"}
            onValueChange={(val) => setEditResolutionType(val as ResolutionType)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intervention_created">Intervention Created</SelectItem>
              <SelectItem value="no_intervention_needed">No Intervention Needed</SelectItem>
              <SelectItem value="defer">Deferred</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Resolution notes..."
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            rows={2}
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={getResolutionVariant(issue.resolution_type)}>
              {getResolutionLabel(issue.resolution_type)}
            </Badge>
          </div>

          {issue.resolution_note && (
            <p className="text-muted-foreground">{issue.resolution_note}</p>
          )}

          {linkedIntervention && (
            <Link 
              to={`/interventions/${linkedIntervention.id}`}
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <Zap className="w-3 h-3" />
              {linkedIntervention.title}
              <Badge variant="outline" className="text-xs ml-1">
                {linkedIntervention.status}
              </Badge>
            </Link>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {resolver && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {resolver.full_name}
              </span>
            )}
            {issue.resolved_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(issue.resolved_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
