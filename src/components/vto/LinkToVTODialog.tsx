import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon } from "lucide-react";

interface LinkToVTODialogProps {
  open: boolean;
  onClose: () => void;
  linkType: 'kpi' | 'rock' | 'issue' | 'doc';
  linkId: string;
  itemName: string;
}

export const LinkToVTODialog = ({ open, onClose, linkType, linkId, itemName }: LinkToVTODialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [selectedGoalKey, setSelectedGoalKey] = useState("");
  const [weight, setWeight] = useState("1.0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active VTO with latest version
  const { data: vtoData, isLoading } = useQuery({
    queryKey: ["active-vto-for-linking", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data: vto, error } = await supabase
        .from("vto")
        .select(`
          id,
          vto_versions!inner(
            id,
            one_year_plan,
            quarterly_rocks,
            three_year_picture,
            version
          )
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true)
        .order("vto_versions(version)", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      // Get the latest version
      const latestVersion = vto.vto_versions[0];
      return {
        vtoId: vto.id,
        versionId: latestVersion.id,
        oneYearPlan: latestVersion.one_year_plan,
        quarterlyRocks: latestVersion.quarterly_rocks,
        threeYearPicture: latestVersion.three_year_picture,
      };
    },
    enabled: open && !!currentUser?.team_id,
  });

  const handleLink = async () => {
    if (!selectedGoalKey || !vtoData?.versionId) {
      toast({
        title: "Error",
        description: "Please select a goal",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("vto_links")
        .insert({
          vto_version_id: vtoData.versionId,
          link_type: linkType,
          link_id: linkId,
          goal_key: selectedGoalKey,
          weight: parseFloat(weight),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${itemName} linked to V/TO goal`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build goal options from VTO data
  const goalOptions = [];
  
  if (vtoData?.oneYearPlan && typeof vtoData.oneYearPlan === 'object' && 'goals' in vtoData.oneYearPlan) {
    const goals = (vtoData.oneYearPlan as any).goals;
    if (Array.isArray(goals)) {
      goals.forEach((goal: string, index: number) => {
        if (goal?.trim()) {
          goalOptions.push({
            key: `one_year_plan.goals[${index}]`,
            label: `1-Year Goal: ${goal}`,
          });
        }
      });
    }
  }

  if (vtoData?.quarterlyRocks && Array.isArray(vtoData.quarterlyRocks)) {
    vtoData.quarterlyRocks.forEach((rock: any, index: number) => {
      if (rock?.title?.trim()) {
        goalOptions.push({
          key: `quarterly_rocks[${index}]`,
          label: `Quarterly Rock: ${rock.title}`,
        });
      }
    });
  }

  if (vtoData?.threeYearPicture && typeof vtoData.threeYearPicture === 'object' && 'revenue_target' in vtoData.threeYearPicture) {
    const threeYear = vtoData.threeYearPicture as any;
    if (threeYear.revenue_target) {
      goalOptions.push({
        key: 'three_year_picture.revenue',
        label: `3-Year Picture: $${threeYear.revenue_target} Revenue`,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Link to V/TO Goal
          </DialogTitle>
          <DialogDescription>
            Connect "{itemName}" to a strategic goal for automatic progress tracking
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading V/TO goals...
          </div>
        ) : !vtoData ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No active V/TO found. Create your V/TO first to link items.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : goalOptions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No goals found in your V/TO. Add goals in the Vision or Traction section first.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-select">Select V/TO Goal</Label>
              <Select value={selectedGoalKey} onValueChange={setSelectedGoalKey}>
                <SelectTrigger id="goal-select">
                  <SelectValue placeholder="Choose a goal..." />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight-input">Weight (optional)</Label>
              <Input
                id="weight-input"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground">
                Higher weight = more impact on V/TO progress
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLink}
                className="flex-1"
                disabled={!selectedGoalKey || isSubmitting}
              >
                {isSubmitting ? "Linking..." : "Link to Goal"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
