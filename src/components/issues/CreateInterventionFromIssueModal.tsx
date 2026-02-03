import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  INTERVENTION_TYPE_OPTIONS,
  type InterventionType,
} from "@/lib/interventions/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { logInterventionEventAsync } from "@/lib/interventions/eventLogger";

interface Issue {
  id: string;
  title: string;
  context?: string | null;
  organization_id: string;
}

interface CreateInterventionFromIssueModalProps {
  open: boolean;
  onClose: () => void;
  issue: Issue;
}

export function CreateInterventionFromIssueModal({
  open,
  onClose,
  issue,
}: CreateInterventionFromIssueModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();

  // Form state - prefilled from issue
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.context || "");
  const [interventionType, setInterventionType] = useState<InterventionType>("other");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [timeHorizon, setTimeHorizon] = useState(60);
  const [startDate, setStartDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Fetch org users
  const { data: users = [] } = useQuery({
    queryKey: ["users", issue.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", issue.organization_id)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleClose = () => {
    onClose();
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("interventions")
        .insert({
          organization_id: issue.organization_id,
          title: title.trim(),
          description: description.trim() || null,
          intervention_type: interventionType,
          status: "planned", // Default to planned
          owner_user_id: ownerUserId || null,
          confidence_level: confidenceLevel,
          expected_time_horizon_days: timeHorizon,
          start_date: startDate || null,
          tags,
          created_by: user.id,
          origin_type: "issue",
          origin_id: issue.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      
      // Log event asynchronously
      logInterventionEventAsync(data.id, "create_intervention", {
        origin_type: "issue",
        origin_id: issue.id,
        intervention_type: interventionType,
      });
      
      toast({
        title: "Intervention created",
        description: "The intervention has been created from this issue.",
      });
      handleClose();
      navigate(`/interventions/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create intervention",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isValid = title.trim().length >= 4;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Create Intervention from Issue
          </DialogTitle>
          <DialogDescription>
            Turn this issue into a tracked intervention to measure impact.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Source Issue Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>From issue:</span>
            <Badge variant="outline">{issue.title}</Badge>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Hire additional front desk staff"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            {title.length > 0 && title.length < 4 && (
              <p className="text-xs text-destructive">Title must be at least 4 characters</p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the intervention and its goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={interventionType} onValueChange={(v) => setInterventionType(v as InterventionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVENTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="grid gap-2">
            <Label>Owner</Label>
            <Select value={ownerUserId} onValueChange={setOwnerUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No owner</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Confidence Level */}
          <div className="grid gap-2">
            <Label>
              Confidence Level: {confidenceLevel}/5
            </Label>
            <Slider
              value={[confidenceLevel]}
              onValueChange={([v]) => setConfidenceLevel(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How confident are you this intervention will resolve the issue?
            </p>
          </div>

          {/* Time Horizon */}
          <div className="grid gap-2">
            <Label>
              Expected Time Horizon: {timeHorizon} days
            </Label>
            <Slider
              value={[timeHorizon]}
              onValueChange={([v]) => setTimeHorizon(v)}
              min={7}
              max={365}
              step={7}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How long until you expect to see results?
            </p>
          </div>

          {/* Start Date */}
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start Date (optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Intervention
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
