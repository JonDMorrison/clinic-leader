import { useEffect, useState } from "react";

export default function DocDownload() {
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("document");

  const params = new URLSearchParams(window.location.search);
  const path = params.get("path");
  const nameParam = params.get("name");

  useEffect(() => {
    if (!path) {
      setError("Missing document path");
      return;
    }
    const name = nameParam || path.split("/").pop() || "document";
    setFileName(name);
    let objectUrl: string | null = null;

    async function startDownload() {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(path)}&mode=download`
        );
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setDownloadUrl(objectUrl);

        // Programmatically trigger download
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err: any) {
        setError(err.message || "Download failed");
      }
    }

    startDownload();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, nameParam]);

  if (error)
    return <div style={{ padding: 24, color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <p>Downloading <strong>{fileName}</strong>...</p>
      {downloadUrl && (
        <p>
          <a 
            href={downloadUrl} 
            download={fileName}
            style={{ color: "blue", textDecoration: "underline" }}
          >
            Click here if download doesn't start automatically
          </a>
        </p>
      )}
    </div>
  );
}
