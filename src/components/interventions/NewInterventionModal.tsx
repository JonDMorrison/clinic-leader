import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  INTERVENTION_TYPE_OPTIONS,
  INTERVENTION_STATUS_OPTIONS,
  type InterventionType,
  type InterventionStatus,
} from "@/lib/interventions/types";
import { InterventionEducationPanel } from "./InterventionEducationPanel";

interface NewInterventionModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  users: { id: string; full_name: string }[];
}

export function NewInterventionModal({
  open,
  onClose,
  organizationId,
  users,
}: NewInterventionModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [interventionType, setInterventionType] = useState<InterventionType>("other");
  const [status, setStatus] = useState<InterventionStatus>("planned");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [timeHorizon, setTimeHorizon] = useState(60);
  const [startDate, setStartDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setInterventionType("other");
    setStatus("planned");
    setOwnerUserId("");
    setConfidenceLevel(3);
    setTimeHorizon(60);
    setStartDate("");
    setTagInput("");
    setTags([]);
    setEstimatedHours("");
    setEstimatedCost("");
  };

  const handleClose = () => {
    resetForm();
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
      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parseNumber = (value: string): number | null => {
        if (!value.trim()) return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };

      const { data, error } = await supabase
        .from("interventions")
        .insert({
          organization_id: organizationId,
          title: title.trim(),
          description: description.trim() || null,
          intervention_type: interventionType,
          status,
          owner_user_id: ownerUserId || null,
          confidence_level: confidenceLevel,
          expected_time_horizon_days: timeHorizon,
          start_date: startDate || null,
          tags,
          created_by: user.id,
          estimated_hours: parseNumber(estimatedHours),
          estimated_cost: parseNumber(estimatedCost),
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      toast({
        title: "Intervention created",
        description: "Your intervention has been created successfully.",
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
          <DialogTitle>New Intervention</DialogTitle>
          <DialogDescription>
            Create a strategic intervention to track and measure its impact.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Inline Education Helper */}
          <InterventionEducationPanel variant="inline" />

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Quarterly Referrer Appreciation Events"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Name after the change you're testing, not the problem.
            </p>
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

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InterventionStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVENTION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner */}
          <div className="grid gap-2">
            <Label>Owner</Label>
            <Select value={ownerUserId || "none"} onValueChange={(val) => setOwnerUserId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No owner</SelectItem>
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
              How confident are you this intervention will achieve its goals?
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

          {/* ROI Estimates (optional) */}
          <div className="grid gap-2 pt-2 border-t">
            <Label className="text-muted-foreground">ROI Estimates (optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="estimatedHours" className="text-xs">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 40"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="estimatedCost" className="text-xs">Estimated Cost ($)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 5000"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>
            </div>
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
