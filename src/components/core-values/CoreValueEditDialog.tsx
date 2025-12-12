import { useState } from "react";
import { useCoreValues, CoreValue } from "@/hooks/useCoreValues";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown, Settings } from "lucide-react";

interface CoreValueEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoreValueEditDialog({ open, onOpenChange }: CoreValueEditDialogProps) {
  const { coreValues, updateValue, refetchValues } = useCoreValues();
  const [editingValue, setEditingValue] = useState<CoreValue | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editingValue) return;
    setSaving(true);
    try {
      await updateValue.mutateAsync(editingValue);
      setEditingValue(null);
      refetchValues();
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (value: CoreValue, direction: "up" | "down") => {
    const currentIndex = coreValues.findIndex((v) => v.id === value.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= coreValues.length) return;

    const targetValue = coreValues[targetIndex];
    
    // Swap sort orders
    await updateValue.mutateAsync({
      id: value.id,
      sort_order: targetValue.sort_order,
    });
    await updateValue.mutateAsync({
      id: targetValue.id,
      sort_order: value.sort_order,
    });
    refetchValues();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Core Values
          </DialogTitle>
          <DialogDescription>
            Manage your organization's core values.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {coreValues.map((value, index) => (
              <div
                key={value.id}
                className={`p-3 border rounded-lg ${!value.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => handleReorder(value, "up")}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === coreValues.length - 1}
                      onClick={() => handleReorder(value, "down")}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{value.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {value.short_behavior || "No behavior description"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={value.is_active}
                      onCheckedChange={(checked) =>
                        updateValue.mutate({ id: value.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingValue(value)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Edit single value */}
        {editingValue && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editingValue.title}
                onChange={(e) =>
                  setEditingValue({ ...editingValue, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Behavior Description</Label>
              <Textarea
                value={editingValue.short_behavior || ""}
                onChange={(e) =>
                  setEditingValue({ ...editingValue, short_behavior: e.target.value })
                }
                placeholder="What does this value look like in action?"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingValue(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
