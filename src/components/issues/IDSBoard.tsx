import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IssueCard } from "./IssueCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SortableIssueProps {
  issue: any;
  onUpdate: () => void;
}

const SortableIssue = ({ issue, onUpdate }: SortableIssueProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <IssueCard
        issue={issue}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

interface IDSBoardProps {
  issues: any[];
  onUpdate: () => void;
}

export const IDSBoard = ({ issues, onUpdate }: IDSBoardProps) => {
  const [items, setItems] = useState(issues);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Update priorities in database based on new order
      try {
        const updates = newItems.map((item, index) => ({
          id: item.id,
          priority: index + 1, // Priority 1 is highest
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from("issues")
            .update({ priority: update.priority })
            .eq("id", update.id);

          if (error) throw error;
        }

        toast({
          title: "Success",
          description: "Issue priorities updated",
        });
        onUpdate();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setItems(issues); // Revert on error
      }
    }
  };

  // Update local state when issues prop changes
  if (JSON.stringify(items.map(i => i.id)) !== JSON.stringify(issues.map(i => i.id))) {
    setItems(issues);
  }

  const openIssues = items.filter(i => i.status !== "solved");
  const solvedIssues = items.filter(i => i.status === "solved");

  return (
    <div className="space-y-8">
      {openIssues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Open Issues (Drag to Prioritize)</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={openIssues.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {openIssues.map((issue) => (
                  <SortableIssue key={issue.id} issue={issue} onUpdate={onUpdate} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {solvedIssues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
            Solved Issues ({solvedIssues.length})
          </h3>
          <div className="space-y-3">
            {solvedIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {openIssues.length === 0 && solvedIssues.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No issues yet. Create your first issue to get started.
        </div>
      )}
    </div>
  );
};
