import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const rockSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  level: z.enum(["company", "team", "individual"]),
  quarter: z.string().trim().min(2, "Quarter is required").max(20, "Quarter must be less than 20 characters"),
  confidence: z.number().min(1).max(5).optional().nullable(),
  due_date: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  status: z.enum(["on_track", "off_track", "done"])
});

interface NewRockModalProps {
  open: boolean;
  onClose: () => void;
  users?: Array<{ id: string; full_name: string }>;
  onSuccess: () => void;
}

export const NewRockModal = ({ open, onClose, users, onSuccess }: NewRockModalProps) => {
  const [formData, setFormData] = useState({
    title: "",
    level: "team" as "company" | "team" | "individual",
    quarter: "",
    confidence: "",
    due_date: undefined as Date | undefined,
    owner_id: "",
    status: "on_track" as "on_track" | "off_track" | "done"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        level: formData.level,
        quarter: formData.quarter,
        confidence: formData.confidence ? parseInt(formData.confidence) : null,
        due_date: formData.due_date ? format(formData.due_date, "yyyy-MM-dd") : null,
        owner_id: formData.owner_id || null,
        status: formData.status
      };

      const validated = rockSchema.parse(payload);

      const { error } = await supabase.from("rocks").insert([{
        title: validated.title,
        level: validated.level,
        quarter: validated.quarter,
        confidence: validated.confidence ?? null,
        due_date: validated.due_date ?? null,
        owner_id: validated.owner_id ?? null,
        status: validated.status
      }]);

      if (error) throw error;

      toast.success("Rock created successfully!");
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: "",
        level: "team",
        quarter: "",
        confidence: "",
        due_date: undefined,
        owner_id: "",
        status: "on_track"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to create rock. Please try again.");
        console.error(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Rock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter rock title"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">
                Level <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.level} onValueChange={(value: any) => setFormData({ ...formData, level: value })}>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
              {errors.level && <p className="text-sm text-destructive">{errors.level}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">
                Quarter <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quarter"
                value={formData.quarter}
                onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                placeholder="e.g., Q1 2025"
              />
              {errors.quarter && <p className="text-sm text-destructive">{errors.quarter}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={formData.owner_id} onValueChange={(value) => setFormData({ ...formData, owner_id: value })}>
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence (1-5)</Label>
              <Input
                id="confidence"
                type="number"
                min="1"
                max="5"
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                placeholder="1-5"
              />
              {errors.confidence && <p className="text-sm text-destructive">{errors.confidence}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData({ ...formData, due_date: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="off_track">Off Track</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Rock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
