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

interface QuickAssignRockOwnersProps {
  organizationId: string;
  owners: Record<string, string>;
  onOwnersChange: (owners: Record<string, string>) => void;
}

export function QuickAssignRockOwners({
  organizationId,
  owners,
  onOwnersChange,
}: QuickAssignRockOwnersProps) {
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

  const levels = [
    { key: "companyOwnerId", label: "Company Rocks" },
    { key: "teamOwnerId", label: "Team Rocks" },
    { key: "individualOwnerId", label: "Individual Rocks" }
  ];

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Assign an owner for each Rock level. Company and Team Rocks typically go to leaders; Individual Rocks to the person completing them.
      </p>
      
      <div className="space-y-3">
        {levels.map((level) => (
          <div key={level.key} className="flex items-center gap-4">
            <Label className="w-40 text-sm font-medium">{level.label}</Label>
            <Select
              value={owners[level.key] || ""}
              onValueChange={(value) => {
                onOwnersChange({
                  ...owners,
                  [level.key]: value,
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
