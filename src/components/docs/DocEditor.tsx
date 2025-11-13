import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { RichTextEditor } from "./RichTextEditor";
import { Upload, FileText, Loader2, Download, X, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentComparisonDialog } from "./ContentComparisonDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const docSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  kind: z.enum(["SOP", "Policy", "Handbook"]),
  body: z.string(),
  status: z.enum(["draft", "approved", "archived"]),
});

interface DocEditorProps {
  open: boolean;
  onClose: () => void;
  doc: {
    id?: string;
    title: string;
    description?: string;
    kind: string;
    body: string;
    status: string;
    version: number;
    requires_ack: boolean;
    owner_id: string | null;
  } | null;
  users: Array<{ id: string; full_name: string }>;
  onSuccess: () => void;
}

export const DocEditor = ({ open, onClose, doc, users, onSuccess }: DocEditorProps) => {
  const [title, setTitle] = useState(doc?.title || "");
  const [description, setDescription] = useState(doc?.description || "");
  const [kind, setKind] = useState(doc?.kind || "SOP");
  const [body, setBody] = useState(doc?.body || "");
  const [status, setStatus] = useState(doc?.status || "draft");
  const [requiresAck, setRequiresAck] = useState(doc?.requires_ack || false);
  const [ownerId, setOwnerId] = useState(doc?.owner_id || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "manual">("manual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    title: string;
    body: string;
    suggestedType: string;
    filename: string;
    filePath: string;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [originalContent, setOriginalContent] = useState<{
    title: string;
    body: string;
    kind: string;
  } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  // Update form fields when doc changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(doc?.title || "");
      setDescription(doc?.description || "");
      setKind(doc?.kind || "SOP");
      setBody(doc?.body || "");
      setStatus(doc?.status || "draft");
      setRequiresAck(doc?.requires_ack || false);
      setOwnerId(doc?.owner_id || "");
      setErrors({});
      setSelectedFile(null);
      setExtractedData(null);
      setUploadMode("manual");
    }
  }, [open, doc]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    setSelectedFile(file);
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus("Uploading file...");
    
    // Store original content before processing
    setOriginalContent({
      title,
      body,
      kind,
    });
    
    try {
      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .maybeSingle();

      if (!userData?.team_id) {
        toast.error("User profile not found");
        return;
      }

      // Upload to temporary location
      const tempPath = `${userData.team_id}/temp/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(tempPath, file);

      if (uploadError) throw uploadError;

      toast.info("Extracting content...");

      // Extract text from document
      const { data: extractData, error: extractError } = await supabase.functions.invoke('doc-extract', {
        body: { filePath: tempPath, organizationId: userData.team_id }
      });

      if (extractError) throw extractError;

      toast.info("AI is analyzing the document...");

      // Parse with AI
      const { data: parseData, error: parseError } = await supabase.functions.invoke('doc-ai-parse', {
        body: { text: extractData.text, filename: file.name }
      });

      if (parseError) throw parseError;

      // Set extracted data
      const newExtractedData = {
        title: parseData.title || file.name.replace(/\.[^/.]+$/, ""),
        body: parseData.body || extractData.text,
        suggestedType: parseData.suggestedType || "SOP",
        filename: file.name,
        filePath: tempPath
      };
      
      setExtractedData(newExtractedData);
      setProcessingStatus("Extraction complete!");

      // Show comparison dialog if editing existing document
      if (doc?.id) {
        setShowComparison(true);
        toast.success("Review the extracted content before applying");
      } else {
        // For new documents, apply directly
        applyExtractedContent(newExtractedData);
        toast.success("Document processed successfully!");
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast.error("Failed to process file. You can still enter content manually.");
      setUploadMode("manual");
      setProcessingStatus("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = async () => {
    if (extractedData?.filePath) {
      // Clean up temp file
      await supabase.storage.from('documents').remove([extractedData.filePath]);
    }
    setSelectedFile(null);
    setExtractedData(null);
    setTitle("");
    setBody("");
  };

  const applyExtractedContent = (data: typeof extractedData) => {
    if (!data) return;
    setTitle(data.title);
    setBody(data.body);
    setKind(data.suggestedType);
  };

  const handleConfirmComparison = () => {
    if (extractedData) {
      applyExtractedContent(extractedData);
      setShowComparison(false);
      toast.success("New content applied successfully!");
    }
  };

  const handleCancelComparison = () => {
    setShowComparison(false);
    setExtractedData(null);
    setSelectedFile(null);
    if (originalContent) {
      setTitle(originalContent.title);
      setBody(originalContent.body);
      setKind(originalContent.kind);
    }
    toast.info("Changes cancelled, keeping current content");
  };

  const handleSubmit = async () => {
    try {
      setErrors({});
      const validated = docSchema.parse({ title, kind, body, status });
      setIsSubmitting(true);

      // Get current user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        setIsSubmitting(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .maybeSingle();

      if (!userData || !userData.team_id) {
        toast.error("User profile not found");
        setIsSubmitting(false);
        return;
      }

      // Handle file upload if present
      let finalFilePath = null;
      let filename = null;
      let fileType = null;

      if (extractedData) {
        // Move from temp to permanent location
        const permanentPath = `${userData.team_id}/docs/${Date.now()}_${extractedData.filename}`;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(extractedData.filePath);

        if (!downloadError && fileData) {
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(permanentPath, fileData);

          if (!uploadError) {
            finalFilePath = permanentPath;
            filename = extractedData.filename;
            fileType = extractedData.filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
            
            // Clean up temp file
            await supabase.storage.from('documents').remove([extractedData.filePath]);
          }
        }
      }

      if (doc?.id) {
        // Update existing doc
        const updateData: any = {
          title: validated.title,
          kind: validated.kind,
          body: validated.body,
          status: validated.status,
          requires_ack: requiresAck,
          owner_id: ownerId || null,
          version: doc.version + 1,
        };

        if (finalFilePath) {
          updateData.file_url = finalFilePath;
          updateData.filename = filename;
          updateData.file_type = fileType;
          updateData.parsed_text = body;
        }

        const { error } = await supabase
          .from("docs")
          .update(updateData)
          .eq("id", doc.id);

        if (error) throw error;
        toast.success("Document updated successfully");
      } else {
        // Create new doc
        const insertData: any = {
          title: validated.title,
          kind: validated.kind,
          body: validated.body,
          status: validated.status,
          requires_ack: requiresAck,
          owner_id: ownerId || null,
          organization_id: userData.team_id,
          version: 1,
        };

        if (finalFilePath) {
          insertData.file_url = finalFilePath;
          insertData.filename = filename;
          insertData.file_type = fileType;
          insertData.parsed_text = body;
        }

        const { error } = await supabase.from("docs").insert(insertData);

        if (error) throw error;
        toast.success("Document created successfully");
      }

      onSuccess();
      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to save document");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{doc?.id ? "Edit Document" : "Create Document"}</DialogTitle>
          </DialogHeader>

        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center gap-4 ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-primary">
                        {processingStatus || "Processing document..."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This may take a moment for large documents
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF or Word documents (max 20MB)
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {selectedFile && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {doc?.id && !isProcessing && extractedData && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      New content has been extracted. Review the changes in the comparison dialog before applying.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Manually enter document content
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
            {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the document (optional)"
            />
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kind">Type *</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOP">SOP</SelectItem>
                  <SelectItem value="Policy">Policy</SelectItem>
                  <SelectItem value="Handbook">Handbook</SelectItem>
                </SelectContent>
              </Select>
              {errors.kind && <p className="text-xs text-danger">{errors.kind}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner">Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="requires-ack"
              checked={requiresAck}
              onCheckedChange={setRequiresAck}
            />
            <Label htmlFor="requires-ack" className="cursor-pointer">
              Require acknowledgment
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content *</Label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your document content..."
            />
            {errors.body && <p className="text-xs text-danger">{errors.body}</p>}
          </div>

          {doc?.id && (
            <p className="text-xs text-muted-foreground">
              Current version: v{doc.version} • Saving will create v{doc.version + 1}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : doc?.id ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {showComparison && extractedData && originalContent && (
        <ContentComparisonDialog
          open={showComparison}
          onClose={handleCancelComparison}
          onConfirm={handleConfirmComparison}
          oldContent={originalContent}
          newContent={extractedData}
          filename={extractedData.filename}
        />
      )}
    </>
  );
};