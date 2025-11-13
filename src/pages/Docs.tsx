import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, BookOpen, Upload, Search, Download } from "lucide-react";
import { InlinePdfViewer } from "@/components/InlinePdfViewer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpHint } from "@/components/help/HelpHint";
import { DocList } from "@/components/docs/DocList";
import { DocEditor } from "@/components/docs/DocEditor";
import { AckPanel } from "@/components/docs/AckPanel";
import { ManagerDashboard } from "@/components/docs/ManagerDashboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { HandbookViewer } from "@/components/docs/HandbookViewer";
import { DocsAIChat } from "@/components/docs/DocsAIChat";
import { BulkUploadModal } from "@/components/docs/BulkUploadModal";
import { PlaybookCard } from "@/components/playbooks/PlaybookCard";
import { UploadPlaybookModal } from "@/components/playbooks/UploadPlaybookModal";
import { Playbook, PLAYBOOK_CATEGORIES } from "@/types/playbook";
import { useDebounce } from "@/hooks/use-debounce";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// DocViewerFrame component for binary files
function DocViewerFrame({ 
  blobUrl, 
  fileName, 
  contentType,
  onDownload 
}: { 
  blobUrl: string; 
  fileName: string; 
  contentType: string | null;
  onDownload: () => void;
}) {
  const isPdf = contentType?.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
  
  const DownloadButton = (
    <Button variant="outline" size="sm" onClick={onDownload}>
      <Download className="w-3 h-3 mr-2" />
      Download
    </Button>
  );
  
  if (isPdf) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
          <span className="text-xs font-medium text-foreground truncate flex-1">{fileName}</span>
          {DownloadButton}
        </div>
        <div className="flex-1 overflow-hidden">
          <InlinePdfViewer blobUrl={blobUrl} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <FileText className="w-16 h-16 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center">
        Preview not available for this file type.
        <br />
        Download to view the document.
      </p>
      {DownloadButton}
    </div>
  );
}

const Docs = () => {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isHandbookOpen, setIsHandbookOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Binary file viewer state
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [viewerContentType, setViewerContentType] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Use custom hook that properly handles impersonation
  const { data: currentUser } = useCurrentUser();

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

  const { data: playbooks, refetch: refetchPlaybooks } = useQuery({
    queryKey: ["playbooks", debouncedSearch, categoryFilter],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      let query = supabase
        .from('playbooks')
        .select('*')
        .eq('organization_id', currentUser.team_id)
        .order('updated_at', { ascending: false });

      if (debouncedSearch.trim()) {
        query = query.textSearch('title,description,parsed_text', debouncedSearch.trim(), {
          type: 'websearch',
          config: 'english'
        });
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
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

  const handleViewDoc = async (doc: any) => {
    setSelectedDoc(doc);
    setIsViewerOpen(true);
    
    // If it's a binary file, fetch via get-document
    if (doc.storage_path) {
      setViewerLoading(true);
      setViewerError(null);
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(doc.storage_path)}&mode=view`
        );
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setViewerBlobUrl(url);
        setViewerContentType(res.headers.get("Content-Type") || "");
        setViewerLoading(false);
      } catch (err: any) {
        console.error("Error loading document:", err);
        setViewerError(err.message || "Failed to load document");
        setViewerLoading(false);
      }
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedDoc(null);
  };

  const handleCloseViewer = () => {
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
    }
    setViewerBlobUrl(null);
    setViewerContentType(null);
    setViewerError(null);
    setViewerLoading(false);
    setIsViewerOpen(false);
    setSelectedDoc(null);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('docs')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast.success('Document deleted successfully');
      refetchDocs();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleReExtract = async (docId: string, storagePath: string) => {
    try {
      toast.info('Re-extracting text from PDF...');
      
      const { error } = await supabase.functions.invoke('extract-doc-text', {
        body: { doc_id: docId, storage_path: storagePath }
      });

      if (error) throw error;

      toast.success('Text extraction started. This may take a moment.');
      setTimeout(() => refetchDocs(), 3000);
    } catch (error) {
      console.error('Error re-extracting text:', error);
      toast.error('Failed to re-extract text');
    }
  };

  const handleBulkReExtract = async () => {
    if (!docs) return;

    // Find all documents with storage_path but no parsed_text
    const docsToExtract = docs.filter(
      (doc: any) => doc.storage_path && !doc.parsed_text
    );

    if (docsToExtract.length === 0) {
      toast.info('All documents have already been extracted');
      return;
    }

    if (!confirm(`This will re-extract text from ${docsToExtract.length} documents. Continue?`)) {
      return;
    }

    toast.info(`Starting bulk extraction for ${docsToExtract.length} documents...`);

    let successCount = 0;
    let errorCount = 0;

    // Process documents sequentially to avoid overwhelming the system
    for (const doc of docsToExtract) {
      try {
        const { error } = await supabase.functions.invoke('extract-doc-text', {
          body: { doc_id: doc.id, storage_path: doc.storage_path }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Error extracting ${doc.title}:`, error);
        errorCount++;
      }
    }

    toast.success(`Bulk extraction complete. Success: ${successCount}, Errors: ${errorCount}`);
    setTimeout(() => refetchDocs(), 3000);
  };

  const handleDownloadDoc = async (doc: any) => {
    if (!doc.storage_path) return;
    
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(doc.storage_path)}&mode=download`
      );
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename || doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err: any) {
      console.error("Error downloading document:", err);
      toast.error("Failed to download document");
    }
  };

  const handleSuccess = () => {
    refetchDocs();
  };

  const handleViewPlaybook = (id: string) => {
    navigate(`/library/${id}`);
  };

  const handleDownloadPlaybook = async (playbook: Playbook) => {
    if (!playbook.file_url) {
      toast.error('File URL not available');
      return;
    }

    try {
      const urlParts = playbook.file_url.split('/');
      const bucketIndex = urlParts.indexOf('playbooks');
      if (bucketIndex === -1) {
        throw new Error('Invalid file URL');
      }
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      const { data, error } = await supabase.storage
        .from('playbooks')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Fetch and download via blob URL
      const fileRes = await fetch(data.signedUrl);
      if (!fileRes.ok) throw new Error(`Download failed (${fileRes.status})`);
      const blob = await fileRes.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = playbook.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDeletePlaybook = async (playbook: Playbook) => {
    if (!confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', playbook.id);

      if (error) throw error;

      toast.success('Playbook deleted successfully');
      refetchPlaybooks();
    } catch (error) {
      console.error('Error deleting playbook:', error);
      toast.error('Failed to delete playbook');
    }
  };

  const isAdmin = currentUser?.role === 'owner';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Documents & Playbooks
            <HelpHint term="Docs" context="docs_header" />
          </h1>
          <p className="text-muted-foreground">SOPs, policies, training materials, and PDF playbooks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsHandbookOpen(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Training Handbook
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="docs" className="w-full">
            <TabsList>
              <TabsTrigger value="docs">Documents</TabsTrigger>
              <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
              {isManager && <TabsTrigger value="dashboard">Manager Dashboard</TabsTrigger>}
            </TabsList>

            <TabsContent value="docs" className="space-y-4 mt-6">
              <div className="flex justify-end gap-2 mb-4">
                {isManager && (
                  <>
                    <Button variant="outline" onClick={handleBulkReExtract}>
                      <FileText className="w-4 h-4 mr-2" />
                      Bulk Re-extract
                    </Button>
                    <Button variant="outline" onClick={() => setBulkUploadModalOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Upload
                    </Button>
                    <Button onClick={handleCreateDoc}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Document
                    </Button>
                  </>
                )}
              </div>
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
                  onDelete={handleDelete}
                  onReExtract={handleReExtract}
                  userRole={currentUser?.role}
                />
              )}
            </TabsContent>

            <TabsContent value="playbooks" className="space-y-4 mt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search playbooks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PLAYBOOK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button onClick={() => setUploadModalOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                )}
              </div>

              {!playbooks || playbooks.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-12 h-12" />}
                  title={searchQuery || categoryFilter !== 'all' ? 'No playbooks found' : 'No playbooks yet'}
                  description={
                    searchQuery || categoryFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : isAdmin ? 'Upload your first playbook to get started' : 'Playbooks will appear here once uploaded'
                  }
                  action={
                    isAdmin && !searchQuery && categoryFilter === 'all' ? (
                      <Button onClick={() => setUploadModalOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Playbook
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playbooks.map((playbook) => (
                    <PlaybookCard
                      key={playbook.id}
                      playbook={playbook}
                      onView={handleViewPlaybook}
                      onDownload={handleDownloadPlaybook}
                      onDelete={handleDeletePlaybook}
                      showDelete={isAdmin}
                    />
                  ))}
                </div>
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
        </div>

        <div className="lg:col-span-1">
          <DocsAIChat />
        </div>
      </div>

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

          {selectedDoc?.storage_path ? (
            // Binary file viewer
            <div className="h-[80vh]">
              {viewerLoading && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading document preview...
                </div>
              )}
              {viewerError && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-destructive">{viewerError}</p>
                  <Button onClick={() => handleDownloadDoc(selectedDoc)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Document
                  </Button>
                </div>
              )}
              {viewerBlobUrl && !viewerLoading && !viewerError && (
                <DocViewerFrame 
                  blobUrl={viewerBlobUrl} 
                  fileName={selectedDoc.filename || selectedDoc.title}
                  contentType={viewerContentType}
                  onDownload={() => handleDownloadDoc(selectedDoc)}
                />
              )}
            </div>
          ) : (
            // Markdown viewer
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
                  <div className="prose prose-base max-w-none dark:prose-invert 
                    prose-headings:font-extrabold prose-headings:text-foreground
                    prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8
                    prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6
                    prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5
                    prose-p:text-foreground prose-p:leading-7 prose-p:mb-4
                    prose-strong:font-extrabold prose-strong:text-foreground
                    prose-ul:list-disc prose-ul:my-4 prose-ul:pl-6
                    prose-ol:list-decimal prose-ol:my-4 prose-ol:pl-6
                    prose-li:text-foreground prose-li:my-2">
                    <ReactMarkdown>{selectedDoc?.body}</ReactMarkdown>
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
          )}
        </DialogContent>
      </Dialog>

      <HandbookViewer 
        open={isHandbookOpen} 
        onClose={() => setIsHandbookOpen(false)} 
      />

      {isManager && (
        <BulkUploadModal
          open={bulkUploadModalOpen}
          onOpenChange={setBulkUploadModalOpen}
          onSuccess={handleSuccess}
          organizationId={currentUser?.team_id || ''}
          userId={currentUser?.id || ''}
        />
      )}

      {isAdmin && (
        <UploadPlaybookModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onSuccess={refetchPlaybooks}
          organizationId={currentUser?.team_id || ''}
          userId={currentUser?.id || ''}
        />
      )}
    </div>
  );
};

export default Docs;
