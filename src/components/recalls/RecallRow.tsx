import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  Voicemail, 
  Calendar, 
  Clock, 
  FileText,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Recall {
  id: string;
  patient_hash: string;
  due_date: string;
  kind: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface RecallRowProps {
  recall: Recall;
  onUpdate: () => void;
}

export function RecallRow({ recall, onUpdate }: RecallRowProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (action: string, newStatus?: string) => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", user.email)
        .single();

      if (!userData) throw new Error("User data not found");

      // Log the action
      await supabase.from("recall_actions").insert({
        organization_id: userData.team_id,
        recall_id: recall.id,
        action,
        actor_id: userData.id,
        details: newNote || null,
      });

      // Update recall if status changed
      if (newStatus) {
        const updateData: any = { status: newStatus };
        if (newNote) {
          const existingNotes = recall.notes || "";
          const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
          updateData.notes = `${existingNotes}\n[${timestamp}] ${newNote}`.trim();
        }

        await supabase
          .from("recalls")
          .update(updateData)
          .eq("id", recall.id);
      }

      toast.success(`Action recorded: ${action}`);
      setNewNote("");
      setShowNotes(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating recall:", error);
      toast.error("Failed to update recall");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = () => {
    switch (recall.status) {
      case "Open":
        return "bg-primary/10 text-primary";
      case "Completed":
        return "bg-success/10 text-success";
      case "Deferred":
        return "bg-warning/10 text-warning";
      case "Unable to Contact":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const getKindColor = () => {
    return recall.kind === "Appointment" 
      ? "bg-brand/10 text-brand" 
      : "bg-accent/10 text-accent";
  };

  const daysOverdue = Math.floor(
    (new Date().getTime() - new Date(recall.due_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="p-4 glass border-white/20 hover:border-brand/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">
              {recall.patient_hash.slice(0, 8)}
            </span>
            <Badge className={getKindColor()}>
              {recall.kind}
            </Badge>
            <Badge className={getStatusColor()}>
              {recall.status}
            </Badge>
            {daysOverdue > 0 && (
              <Badge variant="destructive">
                <Clock className="h-3 w-3 mr-1" />
                {daysOverdue}d overdue
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due: {format(new Date(recall.due_date), "MMM d, yyyy")}
            </span>
          </div>

          {recall.notes && (
            <div className="text-sm bg-muted/30 p-2 rounded border border-white/10">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {recall.notes}
                </p>
              </div>
            </div>
          )}

          {showNotes && (
            <div className="space-y-2 pt-2">
              <Textarea
                placeholder="Add notes about this call/action..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!showNotes ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("Called")}
                disabled={isUpdating}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("Left Voicemail")}
                disabled={isUpdating}
              >
                <Voicemail className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("Booked", "Completed")}
                disabled={isUpdating}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNotes(true)}
                disabled={isUpdating}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => {
                  if (newNote.trim()) {
                    handleAction("NoteAdded");
                  } else {
                    setShowNotes(false);
                  }
                }}
                disabled={isUpdating}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNotes(false);
                  setNewNote("");
                }}
                disabled={isUpdating}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
