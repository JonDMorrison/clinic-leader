# PDF.js Inline Viewer - Working Solution

## Problem
PDF.js integration with Vite was causing the viewer to hang on "Loading PDF preview..." indefinitely.

## Root Causes
1. **Container Mounting Issue**: Component returned early with loading state, preventing the canvas container from mounting
2. **Worker Resolution**: PDF.js worker wasn't being resolved correctly by Vite
3. **Blob URL Fetching**: Worker attempting to fetch blob URLs directly could stall

## Working Solution

### Worker Configuration
```typescript
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
// @ts-ignore - Vite will resolve to an asset URL string
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure PDF.js worker using bundled URL
if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = pdfjsWorker as unknown as string;
}
```

**Key**: Use `?url` import suffix to let Vite bundle the worker as an asset.

### PDF Loading Pattern
```typescript
// Fetch ArrayBuffer in main thread
const ab = await fetch(blobUrl).then((r) => r.arrayBuffer());

// Pass data directly to PDF.js (avoids worker blob URL fetching)
const loadingTask = (pdfjsLib as any).getDocument({ data: ab });
const pdf = await loadingTask.promise;
```

**Key**: Don't pass blob URLs to `getDocument()`. Fetch the ArrayBuffer first and pass via `{ data: ab }`.

### Component Structure
```typescript
// Always render container div (never return early)
return (
  <div className="relative w-full h-full">
    <div ref={containerRef} className="w-full h-full overflow-auto bg-muted/10 p-2" />
    {loading && <div className="absolute inset-0">Loading...</div>}
    {error && <div className="absolute inset-0">{error}</div>}
  </div>
);
```

**Key**: Mount the container immediately. Overlay loading/error states on top. This ensures `useEffect` always has a target to render into.

### Container Ref Safety
```typescript
if (!containerRef.current) {
  // Wait one frame for ref to mount
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

if (containerRef.current) {
  containerRef.current.innerHTML = "";
}
```

**Key**: Handle the edge case where ref might not be ready immediately.

## Implementation Location
- Component: `src/components/InlinePdfViewer.tsx`
- Used in: `src/pages/DocumentUploadAdmin.tsx` via `DocViewerFrame`

## Testing
- Works reliably with blob URLs created from Edge Function responses
- Handles multi-page PDFs correctly
- No more hanging on loading state
- Proper error handling if PDF is invalid

## Do NOT
- Use `new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url)` - doesn't work with Vite
- Use CDN worker URLs - unnecessary external dependency
- Pass blob URLs directly to `getDocument({ url: blobUrl })`
- Return early from component before mounting container div
- Import worker config at app startup (caused React initialization issues)
