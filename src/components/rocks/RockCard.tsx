import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Target, Link as LinkIcon } from "lucide-react";
import { VTOGoalBadge } from "@/components/vto/VTOGoalBadge";
import { LinkToVTODialog } from "@/components/vto/LinkToVTODialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface RockCardProps {
  rock: {
    id: string;
    title: string;
    status: string;
    confidence: number | null;
    due_date: string | null;
    quarter: string;
    owner_id: string | null;
    users?: {
      full_name: string;
    } | null;
  };
  onUpdate: () => void;
}

export const RockCard = ({ rock, onUpdate }: RockCardProps) => {
  const [isEditingConfidence, setIsEditingConfidence] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [confidence, setConfidence] = useState(rock.confidence?.toString() || "");
  const [dueDate, setDueDate] = useState(rock.due_date || "");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleConfidenceUpdate = async () => {
    const confidenceValue = parseInt(confidence);
    if (isNaN(confidenceValue) || confidenceValue < 1 || confidenceValue > 5) {
      toast.error("Confidence must be between 1 and 5");
      return;
    }

    const { error } = await supabase
      .from("rocks")
      .update({ confidence: confidenceValue })
      .eq("id", rock.id);

    if (error) {
      toast.error("Failed to update confidence");
      return;
    }

    toast.success("Confidence updated");
    setIsEditingConfidence(false);
    onUpdate();
  };

  const handleDueDateUpdate = async () => {
    if (!dueDate) {
      toast.error("Please enter a valid date");
      return;
    }

    const { error } = await supabase
      .from("rocks")
      .update({ due_date: dueDate })
      .eq("id", rock.id);

    if (error) {
      toast.error("Failed to update due date");
      return;
    }

    toast.success("Due date updated");
    setIsEditingDueDate(false);
    onUpdate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 4) return "text-success";
    if (conf >= 3) return "text-warning";
    return "text-danger";
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-move hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Target className="w-4 h-4 text-brand mt-1 shrink-0" />
              <CardTitle className="text-sm">{rock.title}</CardTitle>
            </div>
            {rock.users && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(rock.users.full_name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {isEditingDueDate ? (
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={handleDueDateUpdate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDueDateUpdate();
                    if (e.key === "Escape") setIsEditingDueDate(false);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-6 text-xs"
                  autoFocus
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDueDate(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer hover:text-foreground"
                >
                  {rock.due_date
                    ? new Date(rock.due_date).toLocaleDateString()
                    : "No due date"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="muted" className="text-xs">
                  {rock.quarter}
                </Badge>
                <VTOGoalBadge linkType="rock" linkId={rock.id} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkDialogOpen(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Link to V/TO
                </Button>
              </div>

              {isEditingConfidence ? (
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  onBlur={handleConfidenceUpdate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfidenceUpdate();
                    if (e.key === "Escape") setIsEditingConfidence(false);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-6 w-16 text-xs"
                  autoFocus
                />
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingConfidence(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="cursor-pointer flex items-center gap-1"
                >
                  <span
                    className={`text-xs font-medium ${
                      rock.confidence
                        ? getConfidenceColor(rock.confidence)
                        : "text-muted-foreground"
                    }`}
                  >
                    {rock.confidence ? `${rock.confidence}/5` : "No confidence"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LinkToVTODialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        linkType="rock"
        linkId={rock.id}
        itemName={rock.title}
      />
    </div>
  );
};
