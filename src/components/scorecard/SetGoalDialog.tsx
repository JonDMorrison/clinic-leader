import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Target } from "lucide-react";
import { format, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SetGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: string;
  metricName: string;
  organizationId: string;
  currentUserId: string;
}

export const SetGoalDialog = ({
  open,
  onOpenChange,
  metricId,
  metricName,
  organizationId,
  currentUserId,
}: SetGoalDialogProps) => {
  const [goalType, setGoalType] = useState<"quarterly" | "annual">("quarterly");
  const [targetValue, setTargetValue] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(startOfQuarter(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfQuarter(new Date()));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      if (!targetValue || isNaN(Number(targetValue))) {
        throw new Error("Please enter a valid target value");
      }

      const { error } = await supabase
        .from("metric_goals")
        .insert({
          metric_id: metricId,
          organization_id: organizationId,
          goal_type: goalType,
          target_value: Number(targetValue),
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          description: description || null,
          created_by: currentUserId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-goals"] });
      toast({
        title: "Goal created",
        description: `${goalType === "quarterly" ? "Quarterly" : "Annual"} goal set successfully`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create goal",
        description: error.message,
      });
    },
  });

  const handleGoalTypeChange = (type: "quarterly" | "annual") => {
    setGoalType(type);
    if (type === "quarterly") {
      setStartDate(startOfQuarter(new Date()));
      setEndDate(endOfQuarter(new Date()));
    } else {
      setStartDate(startOfYear(new Date()));
      setEndDate(endOfYear(new Date()));
    }
  };

  const handleClose = () => {
    setTargetValue("");
    setDescription("");
    setGoalType("quarterly");
    setStartDate(startOfQuarter(new Date()));
    setEndDate(endOfQuarter(new Date()));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Set Goal for {metricName}
          </DialogTitle>
          <DialogDescription>
            Create a quarterly or annual target to track long-term progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label>Goal Period</Label>
            <Select value={goalType} onValueChange={handleGoalTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                <SelectItem value="annual">Annual (12 months)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label>Target Value *</Label>
            <Input
              type="number"
              placeholder="Enter target value..."
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="What will achieving this goal mean for the team?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createGoalMutation.mutate()}
            disabled={createGoalMutation.isPending || !targetValue}
          >
            {createGoalMutation.isPending ? "Creating..." : "Set Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
