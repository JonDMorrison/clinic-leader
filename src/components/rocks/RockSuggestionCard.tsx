import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RockSuggestion {
  title: string;
  owner_id?: string;
  approved: boolean;
}

interface RockSuggestionCardProps {
  rock: RockSuggestion;
  users: Array<{ id: string; full_name: string }>;
  onToggleApprove: () => void;
  onUpdate: (updates: Partial<RockSuggestion>) => void;
}

export function RockSuggestionCard({
  rock,
  users,
  onToggleApprove,
  onUpdate,
}: RockSuggestionCardProps) {
  return (
    <div
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md rounded-lg border bg-card text-card-foreground",
        rock.approved
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
      onClick={onToggleApprove}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Approval Checkbox */}
          <div
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors",
              rock.approved
                ? "bg-primary border-primary"
                : "border-muted-foreground/30"
            )}
          >
            {rock.approved && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>

          {/* Rock Title */}
          <Input
            value={rock.title}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ title: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm"
            placeholder="Rock title..."
          />
        </div>

        {/* Owner Selection */}
        {rock.approved && (
          <div className="pl-8" onClick={(e) => e.stopPropagation()}>
            <Select
              value={rock.owner_id || ""}
              onValueChange={(value) => onUpdate({ owner_id: value })}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Assign owner..." />
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
        )}
      </div>
    </div>
  );
}
