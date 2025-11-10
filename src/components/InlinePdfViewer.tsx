import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";

// Use CDN worker for reliability - works in all build environments
if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface InlinePdfViewerProps {
  blobUrl: string;
}

export function InlinePdfViewer({ blobUrl }: InlinePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      console.log("[InlinePdfViewer] Starting PDF render, blobUrl:", blobUrl);
      setLoading(true);
      setError(null);

      try {
        if (!containerRef.current) {
          console.warn("[InlinePdfViewer] Container ref not ready");
          return;
        }

        // Clear previous render
        containerRef.current.innerHTML = "";

        console.log("[InlinePdfViewer] Calling getDocument...");
        const loadingTask = (pdfjsLib as any).getDocument(blobUrl);
        const pdf = await loadingTask.promise;
        
        if (cancelled) {
          console.log("[InlinePdfViewer] Cancelled after getDocument");
          return;
        }

        const numPages = pdf.numPages;
        console.log("[InlinePdfViewer] PDF loaded successfully, pages:", numPages);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const viewport = page.getViewport({ scale: 1.2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Could not get canvas context");
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 8px auto";

          containerRef.current.appendChild(canvas);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
          
          console.log(`[InlinePdfViewer] Rendered page ${pageNum}/${numPages}`);
        }

        if (!cancelled) {
          console.log("[InlinePdfViewer] All pages rendered successfully");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[InlinePdfViewer] Error rendering PDF:", err);
        console.error("[InlinePdfViewer] Error details:", err.message, err.stack);
        if (!cancelled) {
          setError("Could not render PDF preview. Please download to view.");
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [blobUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        Loading PDF preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-muted/10 p-2"
    />
  );
}
