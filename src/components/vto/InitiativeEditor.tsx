import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Link as LinkIcon, Target, Mountain } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { OneYearGoal } from "@/lib/vto/models";

interface InitiativeEditorProps {
  goals: OneYearGoal[];
  onChange: (goals: OneYearGoal[]) => void;
  users: Array<{ id: string; full_name: string }>;
  metrics: Array<{ id: string; name: string }>;
  rocks: Array<{ id: string; title: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  at_risk: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  off_track: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  complete: 'bg-primary/10 text-primary',
};

export function InitiativeEditor({ goals, onChange, users, metrics, rocks }: InitiativeEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addGoal = () => {
    const newGoal: OneYearGoal = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      status: 'on_track',
      linked_kpi_ids: [],
      linked_rock_ids: [],
    };
    onChange([...goals, newGoal]);
    setExpandedId(newGoal.id);
  };

  const updateGoal = (id: string, updates: Partial<OneYearGoal>) => {
    onChange(goals.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const removeGoal = (id: string) => {
    onChange(goals.filter((g) => g.id !== id));
  };

  const toggleLinkedKpi = (goalId: string, kpiId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const linked = goal.linked_kpi_ids || [];
    const updated = linked.includes(kpiId)
      ? linked.filter((id) => id !== kpiId)
      : [...linked, kpiId];
    updateGoal(goalId, { linked_kpi_ids: updated });
  };

  const toggleLinkedRock = (goalId: string, rockId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const linked = goal.linked_rock_ids || [];
    const updated = linked.includes(rockId)
      ? linked.filter((id) => id !== rockId)
      : [...linked, rockId];
    updateGoal(goalId, { linked_rock_ids: updated });
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return null;
    return users.find((u) => u.id === ownerId)?.full_name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">1-Year Goals / Initiatives</label>
          <p className="text-xs text-muted-foreground">
            Strategic goals with linked KPIs and quarterly rocks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addGoal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="mb-2">No goals defined yet</p>
          <Button variant="outline" size="sm" onClick={addGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, idx) => (
            <div key={goal.id || idx} className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-muted-foreground">#{idx + 1}</span>
                  <Badge variant="outline" className={STATUS_COLORS[goal.status || 'on_track']}>
                    {(goal.status || 'on_track').replace('_', ' ')}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id || '')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Goal Title</label>
                <Input
                  placeholder="e.g., Increase new patient volume by 25%"
                  value={goal.title}
                  onChange={(e) => updateGoal(goal.id || '', { title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Details, success criteria, key milestones..."
                  value={goal.description || ''}
                  onChange={(e) => updateGoal(goal.id || '', { description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Owner</label>
                  <Select
                    value={goal.owner_id || ''}
                    onValueChange={(val) => updateGoal(goal.id || '', { owner_id: val || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Target Date</label>
                  <Input
                    type="date"
                    value={goal.target_date || ''}
                    onChange={(e) => updateGoal(goal.id || '', { target_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select
                    value={goal.status || 'on_track'}
                    onValueChange={(val) => updateGoal(goal.id || '', { status: val as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="off_track">Off Track</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linked KPIs and Rocks */}
              <div className="flex gap-2 pt-2 border-t">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4 mr-2" />
                      Link KPIs ({goal.linked_kpi_ids?.length || 0})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select KPIs to link</p>
                      {metrics.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No metrics available</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {metrics.map((metric) => (
                            <label
                              key={metric.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={goal.linked_kpi_ids?.includes(metric.id)}
                                onCheckedChange={() => toggleLinkedKpi(goal.id || '', metric.id)}
                              />
                              <span className="text-sm">{metric.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Mountain className="h-4 w-4 mr-2" />
                      Link Rocks ({goal.linked_rock_ids?.length || 0})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select Rocks to link</p>
                      {rocks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No rocks available</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {rocks.map((rock) => (
                            <label
                              key={rock.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={goal.linked_rock_ids?.includes(rock.id)}
                                onCheckedChange={() => toggleLinkedRock(goal.id || '', rock.id)}
                              />
                              <span className="text-sm">{rock.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Show linked badges */}
              {((goal.linked_kpi_ids?.length || 0) > 0 || (goal.linked_rock_ids?.length || 0) > 0) && (
                <div className="flex flex-wrap gap-1">
                  {goal.linked_kpi_ids?.map((kpiId) => {
                    const metric = metrics.find((m) => m.id === kpiId);
                    return metric ? (
                      <Badge key={kpiId} variant="secondary" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        {metric.name}
                      </Badge>
                    ) : null;
                  })}
                  {goal.linked_rock_ids?.map((rockId) => {
                    const rock = rocks.find((r) => r.id === rockId);
                    return rock ? (
                      <Badge key={rockId} variant="secondary" className="text-xs">
                        <Mountain className="h-3 w-3 mr-1" />
                        {rock.title}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
