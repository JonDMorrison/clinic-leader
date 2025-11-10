import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle, Plus, X, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QueuedDoc {
  id: string;
  filename: string;
  title: string;
  category: string;
  parsedText: string;
  filePath: string;
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface DocViewerFrameProps {
  blobUrl: string;
  fileName: string;
  contentType: string | null;
}

function DocViewerFrame({ blobUrl, fileName, contentType }: DocViewerFrameProps) {
  const isPdf =
    (contentType && contentType.toLowerCase().includes("pdf")) ||
    fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    // Debug: Verify we're using a blob URL, not a remote URL
    console.log("[DocViewerFrame] Rendering iframe with src:", blobUrl);
    console.log("[DocViewerFrame] URL protocol:", blobUrl.split(':')[0]);
    
    // Security check: Ensure we're only rendering blob URLs
    if (!blobUrl.startsWith('blob:')) {
      console.error("[DocViewerFrame] SECURITY: Refusing to render non-blob URL:", blobUrl);
      return (
        <div className="p-4 text-xs text-destructive">
          Security error: Invalid document URL
        </div>
      );
    }
    
    return (
      <iframe
        src={blobUrl}
        className="w-full h-full border-0"
        title={fileName}
      />
    );
  }

  return (
    <div className="p-4 text-xs">
      <p className="mb-2 text-muted-foreground">Preview not available for this file type.</p>
      <a
        href={blobUrl}
        download={fileName}
        className="inline-flex items-center px-3 py-1 border rounded hover:bg-accent"
      >
        <Download className="w-3 h-3 mr-2" />
        Download {fileName}
      </a>
    </div>
  );
}

const DocumentUploadAdmin = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [queuedDocs, setQueuedDocs] = useState<QueuedDoc[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", category: "Forms", file: null as File | null });
  
  // Inline viewer state
  const [viewerDoc, setViewerDoc] = useState<any | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [viewerContentType, setViewerContentType] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Fetch uploaded documents from database
  const { data: uploadedDocs, refetch: refetchUploaded } = useQuery({
    queryKey: ["uploaded-docs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("docs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    // Load current user's organization/team id
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.team_id) setOrgId(data.team_id);
    })();
  }, []);

  const uploadDocument = async (doc: QueuedDoc) => {
    try {
      if (!orgId) {
        const errorMsg = "Organization ID not loaded. Please refresh the page.";
        console.error(errorMsg);
        setQueuedDocs(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'error' as const, errorMessage: errorMsg }
            : d
        ));
        return false;
      }
      
      // Set uploading status
      setQueuedDocs(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: 'uploading' as const } : d
      ));

      // Read file blob
      let fileBlob: Blob;
      try {
        if (doc.filePath.startsWith('data:')) {
          const response = await fetch(doc.filePath);
          fileBlob = await response.blob();
        } else {
          const fileResponse = await fetch(doc.filePath);
          fileBlob = await fileResponse.blob();
        }
      } catch (blobError) {
        const errorMsg = `Failed to read file: ${blobError}`;
        console.error(errorMsg, blobError);
        setQueuedDocs(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'error' as const, errorMessage: errorMsg }
            : d
        ));
        return false;
      }

      // Determine correct content type
      const ext = doc.filename.split(".").pop()?.toLowerCase();
      const mappedType = ext === 'pdf'
        ? 'application/pdf'
        : ext === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : ext === 'doc'
            ? 'application/msword'
            : 'application/octet-stream';
      const contentType = mappedType;

      // Create File object with explicit MIME type
      const typedFile = new File([fileBlob], doc.filename, { type: contentType });

      // Generate unique filename with UUID to prevent conflicts
      const uuid = crypto.randomUUID();
      const sanitizedFilename = doc.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${orgId}/${uuid}-${sanitizedFilename}`;
      
      console.log(`Uploading to storage: ${storagePath}`);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("documents")
        .upload(storagePath, typedFile, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        const errorMsg = `Storage upload failed: ${uploadError.message}`;
        console.error(errorMsg, uploadError);
        setQueuedDocs(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'error' as const, errorMessage: errorMsg }
            : d
        ));
        return false;
      }
      
      console.log(`Storage upload successful:`, uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);
      
      console.log(`Public URL: ${urlData.publicUrl}`);

      // Create doc record with storage_path
      const docRecord = {
        title: doc.title,
        kind: "SOP" as const,
        status: "approved" as const,
        file_url: urlData.publicUrl,
        storage_path: storagePath,
        filename: doc.filename,
        file_type: ext === 'pdf' ? 'pdf' : 'docx',
        parsed_text: doc.parsedText,
        requires_ack: false,
        organization_id: orgId,
      };
      
      console.log(`Inserting doc record:`, docRecord);

      const { error: docError, data: docData } = await supabase
        .from("docs")
        .insert(docRecord)
        .select();

      if (docError) {
        const errorMsg = `Database insert failed: ${docError.message}`;
        console.error(errorMsg, docError);
        setQueuedDocs(prev => prev.map(d => 
          d.id === doc.id 
            ? { ...d, status: 'error' as const, errorMessage: errorMsg }
            : d
        ));
        return false;
      }
      
      console.log(`Doc record created:`, docData);

      // Success - remove from queue and show toast
      toast({
        title: "Upload Complete",
        description: `${doc.filename} uploaded successfully.`,
      });

      // Remove from queue
      setQueuedDocs(prev => prev.filter(d => d.id !== doc.id));
      
      // Refresh uploaded docs list
      refetchUploaded();
      
      return true;
    } catch (error) {
      console.error(`Error uploading ${doc.filename}:`, error);
      setQueuedDocs(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, status: 'error' as const, errorMessage: String(error) }
          : d
      ));
      return false;
    }
  };

  const handleAddDocument = () => {
    if (!newDoc.file || !newDoc.title) {
      toast({
        title: "Missing Information",
        description: "Please provide both a file and title.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newQueuedDoc: QueuedDoc = {
        id: crypto.randomUUID(),
        filename: newDoc.file!.name,
        title: newDoc.title,
        category: newDoc.category,
        parsedText: `User uploaded document: ${newDoc.title}`,
        filePath: e.target?.result as string,
        file: newDoc.file!,
        status: 'idle',
      };
      
      setQueuedDocs([...queuedDocs, newQueuedDoc]);
      setNewDoc({ title: "", category: "Forms", file: null });
      setIsAddModalOpen(false);
      
      toast({
        title: "Document Added",
        description: `${newDoc.title} added to upload queue.`,
      });
    };
    reader.readAsDataURL(newDoc.file);
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    
    const docsToUpload = queuedDocs.filter(d => d.status !== 'uploading');
    let successCount = 0;
    
    for (const doc of docsToUpload) {
      const success = await uploadDocument(doc);
      if (success) successCount++;
    }

    setIsUploading(false);
    
    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}.`,
      });
    }
  };

  const handleRetryUpload = (e: React.MouseEvent, doc: QueuedDoc) => {
    e.preventDefault();
    e.stopPropagation();
    uploadDocument(doc);
  };

  const handleRemoveFromQueue = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setQueuedDocs(prev => prev.filter(d => d.id !== docId));
    toast({
      title: "Removed",
      description: "Document removed from queue.",
    });
  };

  const openViewer = async (doc: any) => {
    if (!doc.storage_path) {
      console.error("[Viewer] Missing storage_path", doc);
      toast({
        title: "Error",
        description: "No file path found for this document.",
        variant: "destructive",
      });
      return;
    }

    // Cleanup old blob if exists
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
    
    setViewerDoc(doc);
    setViewerContentType(null);
    setViewerError(null);
    setViewerLoading(true);

    try {
      console.log("[Viewer] Fetching", doc.storage_path);
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(doc.storage_path)}&mode=view`
      );
      console.log("[Viewer] Response status", res.status);

      if (!res.ok) {
        throw new Error(`Failed to load document (${res.status})`);
      }

      const ct = res.headers.get("Content-Type") || "";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      console.log("[Viewer] Blob URL created", url, "CT:", ct);

      setViewerContentType(ct);
      setViewerBlobUrl(url);
      setViewerLoading(false);
    } catch (err: any) {
      console.error("[Viewer] Error", err);
      setViewerError(err.message || "Could not load document.");
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
    }
    setViewerBlobUrl(null);
    setViewerDoc(null);
    setViewerError(null);
    setViewerLoading(false);
  };

  const handleDownloadDoc = async (doc: any) => {
    if (!doc.storage_path) {
      console.error("[Download] Missing storage_path", doc);
      toast({
        title: "Error",
        description: "No file path found for this document.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("[Download] Fetching", doc.storage_path);
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(doc.storage_path)}&mode=download`
      );
      console.log("[Download] Response", res.status);

      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      console.log("[Download] Success");
      toast({
        title: "Download Started",
        description: `Downloading ${doc.filename}...`,
      });
    } catch (err: any) {
      console.error("[Download] Error", err);
      toast({
        title: "Download Failed",
        description: "Could not download document.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Upload Playbooks and Documents</h1>
        <p className="text-muted-foreground">Add SOPs, forms, and training documents to your organization's library</p>
      </div>

      {/* Upload Queue Section */}
      {queuedDocs.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Queue</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQueuedDocs([])}
              >
                Clear Queue
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {queuedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {doc.filename} • {doc.category}
                  </p>
                  {doc.status === 'error' && doc.errorMessage && (
                    <p className="text-sm text-destructive mt-1">{doc.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {doc.status === 'idle' && (
                    <span className="text-sm text-muted-foreground">Ready</span>
                  )}
                  {doc.status === 'uploading' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-primary">Uploading...</span>
                    </>
                  )}
                  {doc.status === 'error' && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleRetryUpload(e, doc)}
                      >
                        Retry
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleRemoveFromQueue(e, doc.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {doc.status === 'idle' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleRemoveFromQueue(e, doc.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              onClick={handleUploadAll}
              disabled={isUploading || !orgId || queuedDocs.length === 0}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : !orgId ? "Loading organization..." : "Upload All Documents"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Document Button */}
      <div className="flex justify-center">
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="lg" type="button">
              <Plus className="w-4 h-4 mr-2" />
              Add Document to Queue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="Enter document title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newDoc.category} onValueChange={(value) => setNewDoc({ ...newDoc, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Forms">Forms</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Intake">Intake</SelectItem>
                    <SelectItem value="Policy">Policy</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddDocument} className="w-full" type="button">
                Add to Queue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Uploaded Documents Section */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedDocs && uploadedDocs.length > 0 ? (
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.filename} • {doc.kind}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openViewer(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadDoc(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet. Add documents to the queue and upload them.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Document Viewer Modal with Blocked-Page Detection */}
      {viewerDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeViewer}
        >
          <div 
            className="bg-card rounded-lg shadow-lg w-[95vw] h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="text-xs font-medium truncate">
                {viewerDoc.filename}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={closeViewer}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 bg-muted/20">
              {viewerLoading && (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                  <span className="text-sm">Loading document...</span>
                </div>
              )}
              
              {viewerError && !viewerLoading && (
                <div className="p-4">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Error Loading Document</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{viewerError}</p>
                </div>
              )}
              
              {!viewerLoading && !viewerError && viewerBlobUrl && (
                <DocViewerFrame
                  blobUrl={viewerBlobUrl}
                  fileName={viewerDoc.filename}
                  contentType={viewerContentType}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadAdmin;
