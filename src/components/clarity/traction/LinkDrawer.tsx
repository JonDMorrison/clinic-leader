import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LinkDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalTitle: string;
  linkedKpis: string[];
  onSave: (kpiIds: string[]) => void;
}

// Mock KPI data - in real app, fetch from database
const MOCK_KPIS = [
  { id: "1", name: "Monthly Revenue", owner: "Finance", current: "$125K" },
  { id: "2", name: "Patient Satisfaction", owner: "Operations", current: "4.8/5" },
  { id: "3", name: "New Patients", owner: "Marketing", current: "45" },
  { id: "4", name: "Staff Utilization", owner: "HR", current: "87%" },
  { id: "5", name: "Treatment Completion", owner: "Clinical", current: "92%" },
];

export function LinkDrawer({ open, onOpenChange, goalTitle, linkedKpis, onSave }: LinkDrawerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(linkedKpis);

  const filteredKpis = MOCK_KPIS.filter((kpi) =>
    kpi.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (kpiId: string) => {
    setSelected((prev) =>
      prev.includes(kpiId) ? prev.filter((id) => id !== kpiId) : [...prev, kpiId]
    );
  };

  const handleSave = () => {
    onSave(selected);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Link KPIs to Priority</SheetTitle>
          <SheetDescription>{goalTitle}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search KPIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={kpi.id}
                    checked={selected.includes(kpi.id)}
                    onCheckedChange={() => handleToggle(kpi.id)}
                  />
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor={kpi.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {kpi.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {kpi.owner}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {kpi.current}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selected.length} KPI{selected.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Links</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
