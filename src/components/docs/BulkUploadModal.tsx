import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface FileUploadItem {
  file: File;
  id: string;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
  kind: string;
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  userId: string;
}

const fileSchema = z.object({
  name: z.string().max(255),
  size: z.number().max(20 * 1024 * 1024, "File must be less than 20MB"),
  type: z.string().refine(
    (type) => ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(type),
    "Only PDF and DOCX files are allowed"
  ),
});

export function BulkUploadModal({ open, onOpenChange, onSuccess, organizationId, userId }: BulkUploadModalProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const validFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    selectedFiles.forEach((file) => {
      const result = fileSchema.safeParse(file);
      if (result.success) {
        validFiles.push({
          file,
          id: `${Date.now()}-${Math.random()}`,
          status: "idle",
          kind: "SOP", // Default kind
        });
      } else {
        errors.push(`${file.name}: ${result.error.errors[0].message}`);
      }
    });

    if (errors.length > 0) {
      toast.error(`Some files were rejected: ${errors.join(", ")}`);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileKind = (id: string, kind: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, kind } : f)));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (!organizationId) {
      toast.error("Organization ID is missing. Please reload the page.");
      console.error("Missing organizationId:", organizationId);
      return;
    }

    if (!userId) {
      toast.error("User ID is missing. Please reload the page.");
      console.error("Missing userId:", userId);
      return;
    }

    console.log("[BulkUpload] Starting upload for org:", organizationId, "user:", userId);
    setUploading(true);

    // Track counts manually to avoid state closure issues
    let successCount = 0;
    let errorCount = 0;

    for (const fileItem of files) {
      if (fileItem.status === "success") continue;

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: "uploading" as const } : f))
      );

      try {
        const file = fileItem.file;
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueFileName = `${crypto.randomUUID()}-${sanitizedName}`;
        const storagePath = `${organizationId}/${uniqueFileName}`;

        console.log("[BulkUpload] Uploading file:", file.name, "to:", storagePath);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("[BulkUpload] Storage upload error:", uploadError);
          throw uploadError;
        }

        console.log("[BulkUpload] Storage upload successful, inserting into docs table");

        // Insert into docs table with extract_status='queued'
        const { data: insertData, error: insertError } = await supabase.from("docs").insert([{
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          organization_id: organizationId,
          kind: fileItem.kind as "SOP" | "Policy" | "Handbook",
          status: "approved" as const,
          version: 1,
          owner_id: userId,
          storage_path: storagePath,
          filename: file.name,
          file_type: fileExt,
          mime_type: file.type,
          extract_status: "queued",
          requires_ack: false,
        }]).select('id').single();

        if (insertError) {
          console.error("[BulkUpload] Database insert error:", insertError);
          throw insertError;
        }

        const docId = insertData.id;
        console.log("[BulkUpload] Document inserted with ID:", docId);

        // Extract text from PDF/DOCX in background (don't wait for completion)
        if (fileExt === 'pdf' || fileExt === 'docx') {
          console.log("[BulkUpload] Triggering text extraction for:", file.name);
          supabase.functions.invoke('extract-doc-text', {
            body: { doc_id: docId, storage_path: storagePath }
          }).then(({ error: extractError }) => {
            if (extractError) {
              console.error("[BulkUpload] Text extraction error:", extractError);
            } else {
              console.log("[BulkUpload] Text extraction triggered successfully for:", file.name);
            }
          });
        }

        console.log("[BulkUpload] Successfully uploaded:", file.name);
        successCount++; // Increment success counter

        // Update status to success
        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: "success" as const } : f))
        );
      } catch (err: any) {
        console.error("[BulkUpload] Upload error for", fileItem.file.name, ":", err);
        errorCount++; // Increment error counter
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "error" as const, error: err.message || "Upload failed" }
              : f
          )
        );
      }
    }

    setUploading(false);

    console.log("[BulkUpload] Upload complete. Success:", successCount, "Errors:", errorCount);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? "s" : ""}`);
      // Always call onSuccess to trigger refetch
      onSuccess();
    }

    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} document${errorCount > 1 ? "s" : ""}. Check console for details.`);
    }

    // Clear successful uploads
    setFiles((prev) => prev.filter((f) => f.status !== "success"));

    if (errorCount === 0 && successCount > 0) {
      onOpenChange(false);
    }
  };

  const getStatusIcon = (status: FileUploadItem["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select Files (PDF or DOCX)</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum 20MB per file. You can select multiple files at once.
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {files.map((fileItem) => (
                  <div key={fileItem.id} className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(fileItem.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fileItem.file.size / 1024).toFixed(1)} KB
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                      )}
                    </div>
                    <Select
                      value={fileItem.kind}
                      onValueChange={(value) => updateFileKind(fileItem.id, value)}
                      disabled={uploading || fileItem.status === "success"}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOP">SOP</SelectItem>
                        <SelectItem value="Policy">Policy</SelectItem>
                        <SelectItem value="Handbook">Handbook</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileItem.id)}
                      disabled={uploading || fileItem.status === "uploading"}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={uploadFiles} disabled={files.length === 0 || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files.length} File{files.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
