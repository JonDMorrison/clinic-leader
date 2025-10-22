import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IDSBoard } from "@/components/issues/IDSBoard";
import { NewIssueModal } from "@/components/issues/NewIssueModal";

const Issues = () => {
  const [newIssueModalOpen, setNewIssueModalOpen] = useState(false);

  const { data: issues, isLoading, refetch } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(full_name), todos(id, title, done_at)")
        .order("priority")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Issues</h1>
          <p className="text-muted-foreground">
            Identify, discuss, and solve operational challenges
          </p>
        </div>
        <Button onClick={() => setNewIssueModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Issue
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IDS Board</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag issues to reorder by priority. Higher priority issues appear first.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading issues...</p>
          ) : (
            <IDSBoard issues={issues || []} onUpdate={refetch} />
          )}
        </CardContent>
      </Card>

      <NewIssueModal
        open={newIssueModalOpen}
        onClose={() => setNewIssueModalOpen(false)}
        teams={teams || []}
        users={users || []}
        onSuccess={refetch}
      />
    </div>
  );
};

export default Issues;
