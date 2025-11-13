import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  id: string;
  title: string;
  owner?: string;
  status: "on_track" | "at_risk" | "off_track" | "complete";
  dueDate?: string;
  linkedKpis?: number;
  onLink?: () => void;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  on_track: { label: "On Track", color: "bg-green-500", icon: CheckCircle2 },
  at_risk: { label: "At Risk", color: "bg-yellow-500", icon: AlertCircle },
  off_track: { label: "Off Track", color: "bg-red-500", icon: AlertCircle },
  complete: { label: "Complete", color: "bg-blue-500", icon: CheckCircle2 },
};

export function GoalCard({
  id,
  title,
  owner,
  status,
  dueDate,
  linkedKpis = 0,
  onLink,
  onClick,
}: GoalCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight">{title}</h4>
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", statusConfig.color)} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {owner && (
              <Badge variant="secondary" className="text-xs">
                {owner}
              </Badge>
            )}
            {dueDate && (
              <span className="text-xs text-muted-foreground">{dueDate}</span>
            )}
          </div>

          {linkedKpis > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>{linkedKpis} KPI{linkedKpis !== 1 ? 's' : ''} linked</span>
            </div>
          )}
        </div>

        {onLink && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onLink();
            }}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
