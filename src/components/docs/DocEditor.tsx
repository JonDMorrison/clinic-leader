import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const docSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  kind: z.enum(["SOP", "Policy", "Handbook"]),
  body: z.string().min(10, "Body must be at least 10 characters"),
  status: z.enum(["draft", "approved", "archived"]),
});

interface DocEditorProps {
  open: boolean;
  onClose: () => void;
  doc: {
    id?: string;
    title: string;
    kind: string;
    body: string;
    status: string;
    version: number;
    requires_ack: boolean;
    owner_id: string | null;
  } | null;
  users: Array<{ id: string; full_name: string }>;
  onSuccess: () => void;
}

export const DocEditor = ({ open, onClose, doc, users, onSuccess }: DocEditorProps) => {
  const [title, setTitle] = useState(doc?.title || "");
  const [kind, setKind] = useState(doc?.kind || "SOP");
  const [body, setBody] = useState(doc?.body || "");
  const [status, setStatus] = useState(doc?.status || "draft");
  const [requiresAck, setRequiresAck] = useState(doc?.requires_ack || false);
  const [ownerId, setOwnerId] = useState(doc?.owner_id || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setErrors({});
      const validated = docSchema.parse({ title, kind, body, status });
      setIsSubmitting(true);

      if (doc?.id) {
        // Update existing doc
        const { error } = await supabase
          .from("docs")
          .update({
            title: validated.title,
            kind: validated.kind,
            body: validated.body,
            status: validated.status,
            requires_ack: requiresAck,
            owner_id: ownerId || null,
            version: doc.version + 1,
          })
          .eq("id", doc.id);

        if (error) throw error;
        toast.success("Document updated successfully");
      } else {
        // Create new doc
        const { error } = await supabase.from("docs").insert({
          title: validated.title,
          kind: validated.kind,
          body: validated.body,
          status: validated.status,
          requires_ack: requiresAck,
          owner_id: ownerId || null,
          version: 1,
        });

        if (error) throw error;
        toast.success("Document created successfully");
      }

      onSuccess();
      onClose();
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
        toast.error("Failed to save document");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc?.id ? "Edit Document" : "Create Document"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
            {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kind">Type *</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOP">SOP</SelectItem>
                  <SelectItem value="Policy">Policy</SelectItem>
                  <SelectItem value="Handbook">Handbook</SelectItem>
                </SelectContent>
              </Select>
              {errors.kind && <p className="text-xs text-danger">{errors.kind}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="requires-ack"
              checked={requiresAck}
              onCheckedChange={setRequiresAck}
            />
            <Label htmlFor="requires-ack" className="cursor-pointer">
              Require acknowledgment
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content (Markdown) *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your document content in markdown..."
              rows={12}
              className="font-mono text-sm"
            />
            {errors.body && <p className="text-xs text-danger">{errors.body}</p>}
          </div>

          {doc?.id && (
            <p className="text-xs text-muted-foreground">
              Current version: v{doc.version} • Saving will create v{doc.version + 1}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : doc?.id ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
