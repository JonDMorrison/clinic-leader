import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Plus, Target, Mountain, AlertTriangle } from "lucide-react";

interface MeetingPrepChecklistProps {
  periodKey: string;
  onAddItem: (section: string) => void;
}

export function MeetingPrepChecklist({ periodKey, onAddItem }: MeetingPrepChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    confirmMonth: false,
    assignData: false,
    topIssues: false,
    rockOwners: false,
  });

  const toggleCheck = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const periodLabel = periodKey ? `${periodKey.slice(0, 4)}-${periodKey.slice(5)}` : "current month";

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-600" />
          Manager Prep Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={checked.confirmMonth}
              onCheckedChange={() => toggleCheck("confirmMonth")}
            />
            <span className={`text-sm ${checked.confirmMonth ? "line-through text-muted-foreground" : ""}`}>
              Confirm scorecard month ({periodLabel})
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={checked.assignData}
              onCheckedChange={() => toggleCheck("assignData")}
            />
            <span className={`text-sm ${checked.assignData ? "line-through text-muted-foreground" : ""}`}>
              Ensure missing data is assigned to owners
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={checked.topIssues}
              onCheckedChange={() => toggleCheck("topIssues")}
            />
            <span className={`text-sm ${checked.topIssues ? "line-through text-muted-foreground" : ""}`}>
              Ensure top 1–3 issues are present in agenda
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={checked.rockOwners}
              onCheckedChange={() => toggleCheck("rockOwners")}
            />
            <span className={`text-sm ${checked.rockOwners ? "line-through text-muted-foreground" : ""}`}>
              Ensure rocks are linked and owners are correct
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onAddItem("scorecard")}>
            <Target className="w-3 h-3 mr-1" />
            Add Scorecard Item
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddItem("rocks")}>
            <Mountain className="w-3 h-3 mr-1" />
            Add Rock Item
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddItem("issues")}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Add Issue Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
