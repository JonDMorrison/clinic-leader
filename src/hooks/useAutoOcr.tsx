import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;
}

interface AutoOcrOptions {
  organizationId: string;
  enabled: boolean;
  onComplete?: () => void;
}

export function useAutoOcr({ organizationId, enabled, onComplete }: AutoOcrOptions) {
  const [processing, setProcessing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !organizationId) return;

    console.log("[AutoOCR] Subscribing to document changes for org:", organizationId);

    // Subscribe to realtime changes for documents needing OCR
    const channel = supabase
      .channel('auto-ocr-docs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'docs',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          const doc = payload.new as any;
          console.log("[AutoOCR] New document detected:", doc.id, "status:", doc.extract_status);
          
          // If document needs OCR and is a PDF, process it
          if (doc.extract_status === 'needs_ocr' && doc.storage_path && doc.file_type === 'pdf') {
            await runAutoOcr(doc.id, doc.storage_path, doc.title || doc.filename);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'docs',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          const doc = payload.new as any;
          console.log("[AutoOCR] Document updated:", doc.id, "status:", doc.extract_status);
          
          // If document was just marked as needs_ocr, process it
          if (doc.extract_status === 'needs_ocr' && doc.storage_path && doc.file_type === 'pdf') {
            await runAutoOcr(doc.id, doc.storage_path, doc.title || doc.filename);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[AutoOCR] Unsubscribing from document changes");
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId]);

  const runAutoOcr = async (docId: string, storagePath: string, docName: string) => {
    // Skip if already processing this document
    if (processing[docId]) {
      console.log("[AutoOCR] Already processing document:", docId);
      return;
    }

    try {
      console.log("[AutoOCR] Starting OCR for document:", docId);
      setProcessing((prev) => ({ ...prev, [docId]: "Starting..." }));
      
      toast.info(`Automatically processing "${docName}"...`, {
        id: `ocr-${docId}`,
        duration: Infinity,
      });

      // Download PDF from storage
      setProcessing((prev) => ({ ...prev, [docId]: "Downloading..." }));
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(storagePath);

      if (downloadError) throw downloadError;

      // Load PDF with PDF.js
      setProcessing((prev) => ({ ...prev, [docId]: "Rendering pages..." }));
      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = Math.min(pdf.numPages, 10); // Limit to 10 pages

      // Initialize Tesseract worker
      setProcessing((prev) => ({ ...prev, [docId]: "Initializing OCR..." }));
      const worker = await createWorker("eng");

      let fullText = "";

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setProcessing((prev) => ({ 
          ...prev, 
          [docId]: `Processing page ${pageNum}/${numPages}...` 
        }));

        toast.loading(`OCR: Page ${pageNum}/${numPages} of "${docName}"`, {
          id: `ocr-${docId}`,
        });

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

      setProcessing((prev) => ({ ...prev, [docId]: "Saving results..." }));

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

      toast.success(`"${docName}" is now readable by AI (${wordCount} words)`, {
        id: `ocr-${docId}`,
      });

      console.log("[AutoOCR] OCR complete for document:", docId);
      
      if (onComplete) {
        onComplete();
      }

      setProcessing((prev) => {
        const { [docId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error: any) {
      console.error("[AutoOCR] OCR error:", error);
      toast.error(`Failed to process "${docName}": ${error.message}`, {
        id: `ocr-${docId}`,
      });
      
      setProcessing((prev) => {
        const { [docId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return { processing };
}
