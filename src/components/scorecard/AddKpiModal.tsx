import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { guardLockedMode } from "@/lib/scorecard/lockedModeGuard";
import { assertOrgId } from "@/hooks/useOrgSafetyCheck";
import { Lock } from "lucide-react";

const kpiSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100, "Name must be less than 100 characters"),
  unit: z.enum(["count", "%", "$", "days"]),
  target: z.number().positive("Target must be positive"),
  direction: z.enum([">=", "<=", "=="]),
  category: z.string().trim().min(2, "Category is required").max(50, "Category must be less than 50 characters"),
});

interface AddKpiModalProps {
  open: boolean;
  onClose: () => void;
  users: any[];
  onSuccess: () => void;
}

export const AddKpiModal = ({ open, onClose, users, onSuccess }: AddKpiModalProps) => {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("count");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState(">=");
  const [category, setCategory] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();

  // Fetch org settings to check if locked mode
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id && open,
  });

  const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // LOCKED MODE GUARD: Block metric creation in locked mode
    if (!guardLockedMode(orgSettings?.scorecard_mode, "add custom metrics")) {
      return;
    }

    try {
      // MULTI-TENANCY: Assert org ID before creating metric
      assertOrgId(currentUser?.team_id, 'metric creation');

      const validated = kpiSchema.parse({
        name: name.trim(),
        unit,
        target: parseFloat(target),
        direction,
        category: category.trim(),
      });

      // Insert into METRICS table (not kpis) - MULTI-TENANCY: Always set organization_id
      const { error } = await supabase.from("metrics").insert({
        name: validated.name,
        unit: validated.unit,
        target: validated.target,
        direction: validated.direction,
        category: validated.category,
        owner: ownerId || null,
        organization_id: currentUser!.team_id, // MULTI-TENANCY: Explicit org ID
        is_active: true,
        sync_source: 'manual',
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Metric created successfully",
      });
      onSuccess();
      onClose();
      
      // Reset form
      setName("");
      setUnit("count");
      setTarget("");
      setDirection(">=");
      setCategory("");
      setOwnerId("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  // Show aligned mode warning
  if (isAlignedMode) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Aligned Scorecard
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground">
            <p>Your organization uses an aligned scorecard template.</p>
            <p className="mt-2">
              Metrics must be managed in the{" "}
              <a href="/scorecard/template" className="text-primary underline">
                Scorecard Template
              </a>
              {" "}page.
            </p>
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Metric</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Appointments"
              maxLength={100}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Operations, Financial"
              maxLength={50}
            />
            {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="%">Percentage (%)</SelectItem>
                  <SelectItem value="$">Currency ($)</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Target Direction *</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">=">&gt;= (At least)</SelectItem>
                  <SelectItem value="<=">&lt;= (At most)</SelectItem>
                  <SelectItem value="==">== (Exactly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Value *</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="100"
              />
              {errors.target && <p className="text-sm text-destructive">{errors.target}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Metric</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
