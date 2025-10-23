import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, BookOpen } from "lucide-react";
import { DocList } from "@/components/docs/DocList";
import { DocEditor } from "@/components/docs/DocEditor";
import { AckPanel } from "@/components/docs/AckPanel";
import { ManagerDashboard } from "@/components/docs/ManagerDashboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";

const Docs = () => {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: docs, refetch: refetchDocs } = useQuery({
    queryKey: ["docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("docs")
        .select("*, users(full_name), acknowledgements(user_id, quiz_score)")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, team_id")
        .order("full_name");

      if (error) throw error;
      return data || [];
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
      return data || [];
    },
  });

  const filteredDocs = useMemo(() => {
    if (!docs) return [];
    return docs.filter((doc) => {
      if (kindFilter !== "all" && doc.kind !== kindFilter) return false;
      if (ownerFilter !== "all" && doc.owner_id !== ownerFilter) return false;
      return true;
    });
  }, [docs, kindFilter, ownerFilter]);

  const isManager = currentUser?.role === "manager" || currentUser?.role === "director" || currentUser?.role === "owner";

  const handleCreateDoc = () => {
    setSelectedDoc(null);
    setIsEditorOpen(true);
  };

  const handleEditDoc = (doc: any) => {
    setSelectedDoc(doc);
    setIsEditorOpen(true);
  };

  const handleViewDoc = (doc: any) => {
    setSelectedDoc(doc);
    setIsViewerOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedDoc(null);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDoc(null);
  };

  const handleSuccess = () => {
    refetchDocs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">SOPs, policies, and training materials</p>
        </div>
        {isManager && (
          <Button onClick={handleCreateDoc}>
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        )}
      </div>

      <Tabs defaultValue="docs" className="w-full">
        <TabsList>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          {isManager && <TabsTrigger value="dashboard">Manager Dashboard</TabsTrigger>}
        </TabsList>

        <TabsContent value="docs" className="space-y-4 mt-6">
          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No documents found"
              description="No documents match the selected filters."
              action={
                isManager ? (
                  <Button onClick={handleCreateDoc}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Document
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DocList
              docs={filteredDocs}
              currentUserId={currentUser?.id || null}
              kindFilter={kindFilter}
              ownerFilter={ownerFilter}
              onKindFilterChange={setKindFilter}
              onOwnerFilterChange={setOwnerFilter}
              onSelectDoc={handleViewDoc}
              users={users || []}
            />
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="dashboard" className="mt-6">
            <ManagerDashboard
              docs={docs || []}
              teams={teams || []}
              users={users || []}
            />
          </TabsContent>
        )}
      </Tabs>

      {isManager && (
        <DocEditor
          open={isEditorOpen}
          onClose={handleCloseEditor}
          doc={selectedDoc}
          users={users || []}
          onSuccess={handleSuccess}
        />
      )}

      <Dialog open={isViewerOpen} onOpenChange={handleCloseViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{selectedDoc?.kind}</span>
              <span>•</span>
              <span>v{selectedDoc?.version}</span>
              <span>•</span>
              <span>
                Updated {selectedDoc?.updated_at && new Date(selectedDoc.updated_at).toLocaleDateString()}
              </span>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap prose-headings:text-foreground prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2">
                  {selectedDoc?.body}
                </div>
              </CardContent>
            </Card>

            {selectedDoc?.requires_ack && (
              <AckPanel
                docId={selectedDoc.id}
                docTitle={selectedDoc.title}
                isAcknowledged={selectedDoc.acknowledgements?.some(
                  (ack: any) => ack.user_id === currentUser?.id
                )}
                withQuiz={true}
                onAcknowledged={handleSuccess}
              />
            )}

            {isManager && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  handleCloseViewer();
                  handleEditDoc(selectedDoc);
                }}>
                  Edit Document
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Docs;
