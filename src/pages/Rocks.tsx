import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Rocks = () => {
  const { data: rocks, isLoading } = useQuery({
    queryKey: ["rocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("*, users(full_name)")
        .order("due_date");
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusVariant = (status: string) => {
    if (status === "done") return "success";
    if (status === "off_track") return "danger";
    return "warning";
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Rocks</h1>
        <p className="text-muted-foreground">90-day priorities and goals</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading rocks...</p>
      ) : (
        <div className="grid gap-6">
          {rocks?.map((rock) => (
            <Card key={rock.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-brand mt-1" />
                    <div>
                      <CardTitle>{rock.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Owner: {rock.users?.full_name || "Unassigned"} • Due: {rock.quarter}
                        {rock.due_date && ` (${new Date(rock.due_date).toLocaleDateString()})`}
                        {" • "}Level: {rock.level.charAt(0).toUpperCase() + rock.level.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(rock.status) as "success" | "warning" | "danger"}>
                      {getStatusLabel(rock.status)}
                    </Badge>
                    {rock.confidence && (
                      <Badge variant="muted">
                        {rock.confidence}% confident
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-brand h-2 rounded-full transition-all"
                    style={{ width: `${rock.confidence || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rocks;
