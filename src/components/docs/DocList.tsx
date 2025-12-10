import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, BookOpen, Trash2, RefreshCw, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  storage_path?: string | null;
  file_type?: string | null;
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
  onEditDoc?: (doc: Doc) => void;
  users: Array<{ id: string; full_name: string }>;
  onDelete?: (docId: string) => void;
  onReExtract?: (docId: string, storagePath: string) => void;
  userRole?: string;
}

export const DocList = ({
  docs,
  currentUserId,
  kindFilter,
  ownerFilter,
  onKindFilterChange,
  onOwnerFilterChange,
  onSelectDoc,
  onEditDoc,
  users,
  onDelete,
  onReExtract,
  userRole,
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
          <div key={doc.id} className="cursor-pointer">
            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-start gap-3 flex-1"
                  onClick={() => onSelectDoc(doc)}
                >
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
                  {doc.file_type && (
                    <Badge variant="muted" className="text-xs uppercase">
                      {doc.file_type}
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
                  {(userRole === 'owner' || userRole === 'manager' || userRole === 'director') && (
                    <div className="flex gap-1">
                      {onEditDoc && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditDoc(doc);
                          }}
                          title="Edit document"
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {doc.storage_path && onReExtract && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReExtract(doc.id, doc.storage_path!);
                          }}
                          title="Re-extract text from PDF"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(doc.id);
                          }}
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
