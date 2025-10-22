import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const issueSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  context: z.string().trim().max(1000, "Context must be less than 1000 characters").optional(),
  priority: z.number().min(1).max(5),
});

interface IssueModalProps {
  open: boolean;
  onClose: () => void;
  prefillData?: {
    kpiName: string;
    week: string;
    value: number;
    target: number;
  };
  users: any[];
  teamId: string | null;
  onSuccess: () => void;
}

export const IssueModal = ({ open, onClose, prefillData, users, teamId, onSuccess }: IssueModalProps) => {
  const [title, setTitle] = useState(
    prefillData
      ? `${prefillData.kpiName} below target (${prefillData.value} vs ${prefillData.target})`
      : ""
  );
  const [context, setContext] = useState(
    prefillData
      ? `Week of ${prefillData.week}: ${prefillData.kpiName} was ${prefillData.value}, target is ${prefillData.target}`
      : ""
  );
  const [priority, setPriority] = useState("2");
  const [ownerId, setOwnerId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = issueSchema.parse({
        title: title.trim(),
        context: context.trim(),
        priority: parseInt(priority),
      });

      const { error } = await supabase.from("issues").insert({
        title: validated.title,
        context: validated.context || null,
        priority: validated.priority,
        team_id: teamId,
        owner_id: ownerId || null,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue created successfully",
      });
      onSuccess();
      onClose();
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
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
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional details about the issue"
              rows={4}
              maxLength={1000}
            />
            {errors.context && <p className="text-sm text-destructive">{errors.context}</p>}
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
            <Button type="submit">Create Issue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
