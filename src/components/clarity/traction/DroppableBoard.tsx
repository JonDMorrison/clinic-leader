import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DroppableBoardProps {
  id: string;
  title: string;
  items: any[];
  onAddNew?: () => void;
  children: React.ReactNode;
}

export function DroppableBoard({ id, title, items, onAddNew, children }: DroppableBoardProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className={cn("flex flex-col", isOver && "ring-2 ring-primary")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{items.length}</span>
          {onAddNew && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddNew}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
          <div ref={setNodeRef} className="space-y-2 min-h-[200px]">
            {children}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}
