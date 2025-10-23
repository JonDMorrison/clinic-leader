import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const SimpleModeToggle = () => {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return user;
    },
  });

  const { data: preferences } = useQuery({
    queryKey: ["userPreferences", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const toggleSimpleMode = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!currentUser?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: currentUser.id,
          simple_mode: enabled,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
      toast.success("Interface mode updated");
    },
    onError: (error) => {
      console.error("Error updating simple mode:", error);
      toast.error("Failed to update interface mode");
    },
  });

  const isSimpleMode = preferences?.simple_mode ?? false;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
      <Sparkles className="w-4 h-4 text-accent" />
      <div className="flex-1">
        <Label htmlFor="simple-mode" className="text-sm font-medium">
          Simple Mode
        </Label>
        <p className="text-xs text-muted-foreground">
          Show only essential features
        </p>
      </div>
      <Switch
        id="simple-mode"
        checked={isSimpleMode}
        onCheckedChange={(checked) => toggleSimpleMode.mutate(checked)}
      />
    </div>
  );
};
