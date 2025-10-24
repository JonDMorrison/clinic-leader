import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, Clock, CheckCircle2, BookOpen } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Doc {
  id: string;
  title: string;
  kind: string;
  status: string;
  version: number;
  owner_id: string | null;
  requires_ack: boolean;
  updated_at: string;
  users?: {
    full_name: string;
  } | null;
  acknowledgements?: Array<{ user_id: string }>;
}

interface DocListProps {
  docs: Doc[];
  currentUserId: string | null;
  kindFilter: string;
  ownerFilter: string;
  onKindFilterChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onSelectDoc: (doc: Doc) => void;
  users: Array<{ id: string; full_name: string }>;
}

export const DocList = ({
  docs,
  currentUserId,
  kindFilter,
  ownerFilter,
  onKindFilterChange,
  onOwnerFilterChange,
  onSelectDoc,
  users,
}: DocListProps) => {
  const getStatusVariant = (status: string) => {
    if (status === "approved") return "success";
    if (status === "archived") return "muted";
    return "warning";
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const isAcknowledged = (doc: Doc) => {
    return doc.acknowledgements?.some((ack) => ack.user_id === currentUserId);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 p-4 bg-card rounded-lg border border-border">
        <div className="space-y-2">
          <Label htmlFor="kind-filter" className="text-xs">Type</Label>
          <Select value={kindFilter} onValueChange={onKindFilterChange}>
            <SelectTrigger id="kind-filter" className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SOP">SOP</SelectItem>
              <SelectItem value="Policy">Policy</SelectItem>
              <SelectItem value="Handbook">Handbook</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner-filter" className="text-xs">Owner</Label>
          <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
            <SelectTrigger id="owner-filter" className="w-[180px]">
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {docs.filter(doc => doc.title !== "Employee Handbook").map((doc) => (
          <div key={doc.id} onClick={() => onSelectDoc(doc)} className="cursor-pointer">
            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-brand mt-1 shrink-0" />
                  <div>
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        Updated {new Date(doc.updated_at).toLocaleDateString()} •
                        v{doc.version} • {doc.users?.full_name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {doc.id === '00000000-0000-0000-0000-000000000001' && (
                    <Badge variant="brand" className="gap-1">
                      <BookOpen className="w-3 h-3" />
                      Official Manual
                    </Badge>
                  )}
                  <Badge variant={getStatusVariant(doc.status) as "success" | "warning" | "muted"}>
                    {getStatusLabel(doc.status)}
                  </Badge>
                  <Badge variant="muted" className="capitalize">
                    {doc.kind}
                  </Badge>
                  {doc.requires_ack && isAcknowledged(doc) && (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                </div>
              </div>
            </CardHeader>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};
