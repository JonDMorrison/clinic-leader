import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const todoSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  due_date: z.string().min(1, "Due date is required for EOS to-dos"),
  owner_id: z.string().min(1, "Owner is required for EOS to-dos"),
});

interface ConvertToTodoModalProps {
  open: boolean;
  onClose: () => void;
  issue: any;
  onSuccess: () => void;
}

export const ConvertToTodoModal = ({ open, onClose, issue, onSuccess }: ConvertToTodoModalProps) => {
  const [title, setTitle] = useState(`Follow up on: ${issue.title}`);
  const [ownerId, setOwnerId] = useState(issue.owner_id || "");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = todoSchema.parse({
        title: title.trim(),
        due_date: dueDate,
        owner_id: ownerId,
      });

      const { error } = await supabase.from("todos").insert({
        issue_id: issue.id,
        organization_id: issue.organization_id,
        title: validated.title,
        owner_id: validated.owner_id,
        due_date: validated.due_date,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Todo created successfully",
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
    setTitle(`Follow up on: ${issue.title}`);
    setOwnerId(issue.owner_id || "");
    setDueDate("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Todo to Issue</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Issue: {issue.title}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Todo Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              required
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner *</Label>
              <Select value={ownerId} onValueChange={setOwnerId} required>
                <SelectTrigger className={!ownerId ? "border-warning" : ""}>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.owner_id && <p className="text-sm text-destructive">{errors.owner_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
                className={!dueDate ? "border-warning" : ""}
              />
              {errors.due_date && <p className="text-sm text-destructive">{errors.due_date}</p>}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Create Todo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
