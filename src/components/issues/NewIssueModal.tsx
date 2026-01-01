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
import { assertOrgId } from "@/hooks/useOrgSafetyCheck";

const issueSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  context: z.string().trim().max(1000, "Context must be less than 1000 characters").optional(),
  priority: z.number().min(1).max(5),
});

interface NewIssueModalProps {
  open: boolean;
  onClose: () => void;
  teams: any[];
  users: any[];
  onSuccess: () => void;
  organizationId?: string; // Make it explicit
}

export const NewIssueModal = ({ open, onClose, teams, users, onSuccess, organizationId }: NewIssueModalProps) => {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
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

      // Use passed organizationId, or fallback to first team (for backwards compat)
      const effectiveOrgId = organizationId || teams[0]?.id;
      
      // MULTI-TENANCY: Assert org ID is valid before insert
      assertOrgId(effectiveOrgId, 'issue creation');

      const { error } = await supabase.from("issues").insert({
        title: validated.title,
        context: validated.context || null,
        priority: validated.priority,
        organization_id: effectiveOrgId, // MULTI-TENANCY: Always set org ID
        owner_id: ownerId && ownerId !== "_unassigned" ? ownerId : null,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue created successfully",
      });
      onSuccess();
      handleClose();
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

  const handleClose = () => {
    setTitle("");
    setContext("");
    setPriority("2");
    setOwnerId("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Issue</DialogTitle>
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
                <SelectItem value="_unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Create Issue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
