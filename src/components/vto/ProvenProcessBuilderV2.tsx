import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, X, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProvenProcessStep, ProvenProcess } from "@/lib/vto/models";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ProvenProcessBuilderV2Props {
  value: ProvenProcess;
  onChange: (value: ProvenProcessStep[]) => void;
  organizationId: string;
}

// Convert legacy string format to new hierarchical format
function normalizeProvenProcess(value: ProvenProcess): ProvenProcessStep[] {
  if (typeof value === 'string') {
    // Legacy format: string or comma/newline separated
    const steps = value.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);
    return steps.map((title, i) => ({
      id: crypto.randomUUID(),
      title,
      order: i,
      sub_steps: [],
    }));
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

interface SortableStepProps {
  step: ProvenProcessStep;
  onUpdate: (id: string, updates: Partial<ProvenProcessStep>) => void;
  onRemove: (id: string) => void;
  onAddSubStep: (id: string) => void;
  onUpdateSubStep: (stepId: string, subId: string, title: string) => void;
  onRemoveSubStep: (stepId: string, subId: string) => void;
}

function SortableStep({ step, onUpdate, onRemove, onAddSubStep, onUpdateSubStep, onRemoveSubStep }: SortableStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Step title (e.g., Initial Assessment)"
            value={step.title}
            onChange={(e) => onUpdate(step.id, { title: e.target.value })}
            className="font-medium"
          />
          <Textarea
            placeholder="Description (optional)"
            value={step.description || ""}
            onChange={(e) => onUpdate(step.id, { description: e.target.value })}
            rows={2}
            className="text-sm"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onRemove(step.id)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            {isOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
            Sub-steps ({step.sub_steps?.length || 0})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 pt-2 space-y-2">
          {step.sub_steps?.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2">
              <Input
                placeholder="Sub-step"
                value={sub.title}
                onChange={(e) => onUpdateSubStep(step.id, sub.id, e.target.value)}
                className="text-sm"
              />
              <Button variant="ghost" size="icon" onClick={() => onRemoveSubStep(step.id, sub.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onAddSubStep(step.id)}>
            <Plus className="h-3 w-3 mr-1" />
            Add Sub-step
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function ProvenProcessBuilderV2({ value, onChange, organizationId }: ProvenProcessBuilderV2Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const steps = normalizeProvenProcess(value);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      onChange(reordered);
    }
  };

  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          intent: "generate_template",
          context: { organization_id: organizationId },
          field: "proven_process",
          current_value: steps.map(s => s.title).join(", "),
        },
      });

      if (error) throw error;
      if (data?.suggestions?.length) {
        const suggested = data.suggestions.map((s: any, i: number) => ({
          id: crypto.randomUUID(),
          title: typeof s === 'string' ? s : s.text || `Step ${i + 1}`,
          order: i,
          sub_steps: [],
        }));
        onChange(suggested.slice(0, 7));
        toast({ title: "AI Draft Generated", description: "Review and customize the suggested process." });
      }
    } catch (error) {
      console.error("AI draft error:", error);
      toast({ title: "AI draft failed", description: "Could not generate suggestions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    const newStep: ProvenProcessStep = {
      id: crypto.randomUUID(),
      title: "",
      order: steps.length,
      sub_steps: [],
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<ProvenProcessStep>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const addSubStep = (stepId: string) => {
    onChange(
      steps.map((s) =>
        s.id === stepId
          ? { ...s, sub_steps: [...(s.sub_steps || []), { id: crypto.randomUUID(), title: "" }] }
          : s
      )
    );
  };

  const updateSubStep = (stepId: string, subId: string, title: string) => {
    onChange(
      steps.map((s) =>
        s.id === stepId
          ? { ...s, sub_steps: s.sub_steps?.map((sub) => (sub.id === subId ? { ...sub, title } : sub)) }
          : s
      )
    );
  };

  const removeSubStep = (stepId: string, subId: string) => {
    onChange(
      steps.map((s) =>
        s.id === stepId
          ? { ...s, sub_steps: s.sub_steps?.filter((sub) => sub.id !== subId) }
          : s
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Proven Process</label>
          <p className="text-xs text-muted-foreground">Your step-by-step methodology for delivering results</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {steps.map((step) => (
              <SortableStep
                key={step.id}
                step={step}
                onUpdate={updateStep}
                onRemove={removeStep}
                onAddSubStep={addSubStep}
                onUpdateSubStep={updateSubStep}
                onRemoveSubStep={removeSubStep}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {steps.length < 7 && (
        <Button variant="outline" onClick={addStep} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      )}
    </div>
  );
}
