import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuickAssignOwnersProps {
  groups: string[];
  organizationId: string;
  owners: Record<string, string>;
  onOwnersChange: (owners: Record<string, string>) => void;
}

export function QuickAssignOwners({
  groups,
  organizationId,
  owners,
  onOwnersChange,
}: QuickAssignOwnersProps) {
  const { data: users } = useQuery({
    queryKey: ["team-users", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("team_id", organizationId)
        .order("full_name");
      return data || [];
    },
  });

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Assign an owner for each KPI group. They'll be responsible for tracking and reporting these metrics.
      </p>
      
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group} className="flex items-center gap-4">
            <Label className="w-32 text-sm font-medium">{group}</Label>
            <Select
              value={owners[group] || ""}
              onValueChange={(value) => {
                onOwnersChange({
                  ...owners,
                  [group]: value,
                });
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select owner..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} <span className="text-muted-foreground">({user.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
