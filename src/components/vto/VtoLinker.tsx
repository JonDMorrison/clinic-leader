import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Link as LinkIcon } from "lucide-react";

interface VtoLinkerProps {
  vtoVersionId: string;
  goalKey: string;
  goalTitle: string;
}

export const VtoLinker = ({ vtoVersionId, goalKey, goalTitle }: VtoLinkerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkType, setLinkType] = useState<'kpi' | 'rock' | 'issue' | 'doc'>('kpi');
  const [linkId, setLinkId] = useState("");
  const [weight, setWeight] = useState(1.0);

  // Fetch existing links
  const { data: links } = useQuery({
    queryKey: ["vto-links", vtoVersionId, goalKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vto_links")
        .select("*")
        .eq("vto_version_id", vtoVersionId)
        .eq("goal_key", goalKey);

      if (error) throw error;
      return data;
    },
  });

  // Fetch available items to link
  const { data: availableItems } = useQuery({
    queryKey: ["vto-linkable-items", linkType],
    queryFn: async () => {
      if (linkType === 'kpi') {
        const { data, error } = await supabase
          .from("kpis")
          .select("id, name")
          .eq("active", true)
          .order("name");
        if (error) throw error;
        return data;
      } else if (linkType === 'rock') {
        const { data, error } = await supabase
          .from("rocks")
          .select("id, title")
          .order("title");
        if (error) throw error;
        return data.map(r => ({ id: r.id, name: r.title }));
      } else if (linkType === 'issue') {
        const { data, error } = await supabase
          .from("issues")
          .select("id, title")
          .eq("status", "open")
          .order("title");
        if (error) throw error;
        return data.map(i => ({ id: i.id, name: i.title }));
      } else if (linkType === 'doc') {
        const { data, error } = await supabase
          .from("docs")
          .select("id, title")
          .order("title");
        if (error) throw error;
        return data.map(d => ({ id: d.id, name: d.title }));
      }
      return [];
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("vto_links")
        .insert({
          vto_version_id: vtoVersionId,
          link_type: linkType,
          link_id: linkId,
          goal_key: goalKey,
          weight: weight,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Link added!" });
      queryClient.invalidateQueries({ queryKey: ["vto-links"] });
      setLinkId("");
      setWeight(1.0);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("vto_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Link removed!" });
      queryClient.invalidateQueries({ queryKey: ["vto-links"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Links for "{goalTitle}"
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect this goal to KPIs, Rocks, Issues, or Docs for automatic progress tracking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Links */}
        <div className="space-y-2">
          {links?.map((link) => (
            <div key={link.id} className="flex items-center justify-between glass p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{link.link_type.toUpperCase()}</Badge>
                <span className="text-sm">Weight: {link.weight}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLinkMutation.mutate(link.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {(!links || links.length === 0) && (
            <p className="text-sm text-muted-foreground">No links yet. Add one below.</p>
          )}
        </div>

        {/* Add New Link */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Select value={linkType} onValueChange={(v) => setLinkType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kpi">KPI</SelectItem>
                <SelectItem value="rock">Rock</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="doc">Doc</SelectItem>
              </SelectContent>
            </Select>

            <Select value={linkId} onValueChange={setLinkId}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                {availableItems?.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              placeholder="Weight"
              className="w-24"
            />
            <Button
              onClick={() => addLinkMutation.mutate()}
              disabled={!linkId || addLinkMutation.isPending}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

