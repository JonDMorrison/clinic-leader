import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, AlertCircle, CheckCircle, Clock, FileQuestion, Scan } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { createWorker } from "tesseract.js";
// Use pdf.js with bundler-provided worker URL
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - Vite provides a URL for the worker bundle
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

// Configure PDF.js worker for client-side rendering using bundled worker URL
if (typeof window !== "undefined") {
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;
}

export default function AdminIngestion() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ [key: string]: string }>({});

  const { data: docs, isLoading, refetch } = useQuery({
    queryKey: ["admin-docs-ingestion", currentUser?.team_id],
    enabled: !!currentUser?.team_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("docs")
        .select("*")
        .eq("organization_id", currentUser!.team_id!)
        .not("storage_path", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleReExtract = async (docId: string, storagePath: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke("extract-doc-text", {
        body: { doc_id: docId, storage_path: storagePath },
      });

      if (error) throw error;

      toast.success("Document re-extraction started");
      await refetch();
    } catch (error: any) {
      console.error("Re-extract error:", error);
      toast.error(error.message || "Failed to re-extract document");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReExtract = async () => {
    if (!currentUser?.team_id) return;

    try {
      setProcessing(true);
      toast.info("Starting bulk re-extraction...");

      const { data, error } = await supabase.functions.invoke("bulk-extract-docs", {
        body: { organization_id: currentUser.team_id },
      });

      if (error) throw error;

      toast.success(data?.message || "Bulk re-extraction complete");
      await refetch();
    } catch (error: any) {
      console.error("Bulk re-extract error:", error);
      toast.error(error.message || "Failed to bulk re-extract documents");
    } finally {
      setProcessing(false);
    }
  };

  const handleRunOcr = async (docId: string, storagePath: string) => {
    try {
      setOcrProgress((prev) => ({ ...prev, [docId]: "Downloading PDF..." }));

      // Download PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError) throw downloadError;

      setOcrProgress((prev) => ({ ...prev, [docId]: "Rendering pages..." }));

      // Load PDF with PDF.js using real worker
      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = Math.min(pdf.numPages, 10); // Limit to 10 pages for performance

      // Initialize Tesseract worker
      setOcrProgress((prev) => ({ ...prev, [docId]: "Initializing OCR..." }));
      const worker = await createWorker("eng");

      let fullText = "";

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setOcrProgress((prev) => ({ 
          ...prev, 
          [docId]: `Processing page ${pageNum}/${numPages}...` 
        }));

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        // Render page to canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d")!;

        await page.render({ 
          canvasContext: context, 
          viewport,
          canvas 
        }).promise;

        // Convert canvas to blob and run OCR
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/png");
        });

        const { data: { text } } = await worker.recognize(blob);
        fullText += text + "\n\n";
      }

      await worker.terminate();

      setOcrProgress((prev) => ({ ...prev, [docId]: "Saving results..." }));

      // Update database with extracted text
      const wordCount = fullText.trim().split(/\s+/).length;
      const { error: updateError } = await supabase
        .from("docs")
        .update({
          parsed_text: fullText.slice(0, 250000),
          extract_status: "ready",
          extract_source: "client_ocr",
          extracted_at: new Date().toISOString(),
          word_count: wordCount,
          extract_error: null,
        })
        .eq("id", docId);

      if (updateError) throw updateError;

      toast.success(`OCR complete: ${wordCount} words extracted`);
      await refetch();
      setOcrProgress((prev) => {
        const { [docId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error: any) {
      console.error("OCR error:", error);
      toast.error(error.message || "Failed to run OCR");
      setOcrProgress((prev) => {
        const { [docId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "queued" || status === "pending") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Queued
        </Badge>
      );
    }
    if (status === "extracting") {
      return (
        <Badge variant="secondary" className="gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Extracting
        </Badge>
      );
    }
    if (status === "ready") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Ready
        </Badge>
      );
    }
    if (status === "needs_ocr") {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-600">
          <FileQuestion className="h-3 w-3" />
          Needs OCR
        </Badge>
      );
    }
    if (status === "error") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  if (userLoading || isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Ingestion</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage document text extraction status
          </p>
        </div>
        <Button
          onClick={handleBulkReExtract}
          disabled={processing}
          className="gap-2"
        >
          {processing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Bulk Re-extract All
            </>
          )}
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Words</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Extracted</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs && docs.length > 0 ? (
              docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.filename || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{(doc as any).mime_type || doc.kind}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge((doc as any).extract_status)}</TableCell>
                  <TableCell>
                    {(doc as any).word_count ? (doc as any).word_count.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(doc as any).extract_source || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(doc as any).extracted_at
                      ? new Date((doc as any).extracted_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {(doc as any).extract_error || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReExtract(doc.id, doc.storage_path!)}
                        disabled={processing || !!ocrProgress[doc.id]}
                        className="gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Re-extract
                      </Button>
                      {(doc as any).extract_status === "needs_ocr" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRunOcr(doc.id, doc.storage_path!)}
                          disabled={!!ocrProgress[doc.id]}
                          className="gap-1"
                        >
                          <Scan className="h-3 w-3" />
                          {ocrProgress[doc.id] || "Run OCR"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No documents found with storage paths
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
