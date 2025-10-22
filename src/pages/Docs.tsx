import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Docs = () => {
  const { data: docs, isLoading } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("docs")
        .select("*, users(full_name), acknowledgements(id)")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    if (status === "approved") return { variant: "success", label: "Approved" };
    if (status === "draft") return { variant: "muted", label: "Draft" };
    return { variant: "warning", label: "Archived" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
        <p className="text-muted-foreground">Process documentation and resources</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading documents...</p>
          ) : (
            <div className="space-y-4">
              {docs?.map((doc) => {
                const statusBadge = getStatusBadge(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-border"
                  >
                    <FileText className="w-5 h-5 text-brand mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {doc.kind} • Version {doc.version} • Owner: {doc.users?.full_name || "Unassigned"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated {new Date(doc.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={statusBadge.variant as "success" | "warning" | "muted"}>
                            {statusBadge.label}
                          </Badge>
                          {doc.requires_ack && (
                            <Badge variant="brand" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Requires Ack
                            </Badge>
                          )}
                        </div>
                      </div>
                      {doc.acknowledgements && doc.acknowledgements.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {doc.acknowledgements.length} acknowledgement(s)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Docs;
