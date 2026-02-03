import { useState, useEffect } from "react";
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
  type InterventionRow,
} from "@/lib/interventions/types";

interface EditInterventionModalProps {
  open: boolean;
  onClose: () => void;
  intervention: InterventionRow;
  users: { id: string; full_name: string }[];
}

export function EditInterventionModal({
  open,
  onClose,
  intervention,
  users,
}: EditInterventionModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state - initialize from intervention
  const [title, setTitle] = useState(intervention.title);
  const [description, setDescription] = useState(intervention.description || "");
  const [interventionType, setInterventionType] = useState<InterventionType>(intervention.intervention_type);
  const [status, setStatus] = useState<InterventionStatus>(intervention.status);
  const [ownerUserId, setOwnerUserId] = useState<string>(intervention.owner_user_id || "");
  const [confidenceLevel, setConfidenceLevel] = useState(intervention.confidence_level);
  const [timeHorizon, setTimeHorizon] = useState(intervention.expected_time_horizon_days);
  const [startDate, setStartDate] = useState(intervention.start_date || "");
  const [endDate, setEndDate] = useState(intervention.end_date || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(intervention.tags || []);

  // Reset form when intervention changes
  useEffect(() => {
    setTitle(intervention.title);
    setDescription(intervention.description || "");
    setInterventionType(intervention.intervention_type);
    setStatus(intervention.status);
    setOwnerUserId(intervention.owner_user_id || "");
    setConfidenceLevel(intervention.confidence_level);
    setTimeHorizon(intervention.expected_time_horizon_days);
    setStartDate(intervention.start_date || "");
    setEndDate(intervention.end_date || "");
    setTags(intervention.tags || []);
  }, [intervention]);

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("interventions")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          intervention_type: interventionType,
          status,
          owner_user_id: ownerUserId || null,
          confidence_level: confidenceLevel,
          expected_time_horizon_days: timeHorizon,
          start_date: startDate || null,
          end_date: endDate || null,
          tags,
        })
        .eq("id", intervention.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention", intervention.id] });
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      toast({
        title: "Intervention updated",
        description: "Your changes have been saved.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update intervention",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isValid =
    title.trim().length >= 4 &&
    confidenceLevel >= 1 &&
    confidenceLevel <= 5 &&
    timeHorizon >= 7 &&
    timeHorizon <= 365;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Intervention</DialogTitle>
          <DialogDescription>
            Update the intervention details below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
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
            <Label>Confidence Level: {confidenceLevel}/5</Label>
            <Slider
              value={[confidenceLevel]}
              onValueChange={([v]) => setConfidenceLevel(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Time Horizon */}
          <div className="grid gap-2">
            <Label>Expected Time Horizon: {timeHorizon} days</Label>
            <Slider
              value={[timeHorizon]}
              onValueChange={([v]) => setTimeHorizon(v)}
              min={7}
              max={365}
              step={7}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!isValid || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
