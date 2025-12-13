import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Target, Link as LinkIcon, GripVertical } from "lucide-react";
import { VTOGoalBadge } from "@/components/vto/VTOGoalBadge";
import { LinkToVTODialog } from "@/components/vto/LinkToVTODialog";
import { LinkedMetricsBadges } from "./LinkedMetricsBadges";
import { RealityGapBadge } from "./RealityGapBadge";
import { useDraggable } from "@dnd-kit/core";
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingConfidence, setIsEditingConfidence] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [title, setTitle] = useState(rock.title);
  const [confidence, setConfidence] = useState(rock.confidence?.toString() || "");
  const [dueDate, setDueDate] = useState(rock.due_date || "");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ id: rock.id });

  const style = {
    opacity: isDragging ? 0.3 : 1,
  };

  const handleTitleUpdate = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      toast.error("Title must be at least 3 characters");
      setTitle(rock.title); // Reset to original
      return;
    }
    if (trimmedTitle.length > 200) {
      toast.error("Title must be less than 200 characters");
      return;
    }

    const { error } = await supabase
      .from("rocks")
      .update({ title: trimmedTitle })
      .eq("id", rock.id);

    if (error) {
      toast.error("Failed to update title");
      return;
    }

    toast.success("Title updated");
    setIsEditingTitle(false);
    onUpdate();
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
    <div ref={setNodeRef} style={style} {...attributes} className="transition-opacity duration-200">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -m-1 hover:bg-muted/50 rounded"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div className="flex items-start gap-2 flex-1">
              <Target className="w-4 h-4 text-brand mt-1 shrink-0" />
              {isEditingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleUpdate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleUpdate();
                    if (e.key === "Escape") {
                      setTitle(rock.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-7 text-sm font-semibold"
                  autoFocus
                />
              ) : (
                <div 
                  className="cursor-pointer hover:opacity-80 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <CardTitle className="text-sm hover:underline">
                    {rock.title}
                  </CardTitle>
                </div>
              )}
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

            {/* Linked KPIs Section */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Linked KPIs</span>
                <RealityGapBadge rockId={rock.id} rockTitle={rock.title} />
              </div>
              <LinkedMetricsBadges 
                rock={{ id: rock.id, title: rock.title, quarter: rock.quarter }} 
                onUpdate={onUpdate}
              />
            </div>

            {/* V/TO Link Button */}
            <div className="flex items-center gap-2 pt-1">
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
