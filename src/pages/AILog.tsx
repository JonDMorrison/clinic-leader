import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AILog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["ai-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getTypeBadge = (type: string) => {
    const colors: Record<string, any> = {
      insight: "success",
      agenda: "brand",
      issue: "warning",
      forecast: "muted",
      benchmark: "muted",
      chat: "muted",
    };
    return <Badge variant={colors[type] || "muted"}>{type}</Badge>;
  };

  const filterByType = (type: string) => {
    return logs?.filter((log) => log.type === type) || [];
  };

  const renderLogs = (filteredLogs: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredLogs.length === 0 ? (
          <TableRow>
            <TableCell className="text-center text-muted-foreground">
              No logs found
            </TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
        ) : (
          filteredLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{getTypeBadge(log.type)}</TableCell>
              <TableCell className="text-sm">
                {new Date(log.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                <pre className="text-xs text-muted-foreground max-w-md overflow-x-auto">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">AI Activity Log</h1>
        <p className="text-muted-foreground">Monitor all AI-generated insights and actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading logs...</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({logs?.length || 0})</TabsTrigger>
                <TabsTrigger value="insight">
                  Insights ({filterByType("insight").length})
                </TabsTrigger>
                <TabsTrigger value="agenda">
                  Agendas ({filterByType("agenda").length})
                </TabsTrigger>
                <TabsTrigger value="issue">
                  Issues ({filterByType("issue").length})
                </TabsTrigger>
                <TabsTrigger value="chat">
                  Chat ({filterByType("chat").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">{renderLogs(logs || [])}</TabsContent>
              <TabsContent value="insight">{renderLogs(filterByType("insight"))}</TabsContent>
              <TabsContent value="agenda">{renderLogs(filterByType("agenda"))}</TabsContent>
              <TabsContent value="issue">{renderLogs(filterByType("issue"))}</TabsContent>
              <TabsContent value="chat">{renderLogs(filterByType("chat"))}</TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AILog;
