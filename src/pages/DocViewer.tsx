import { useEffect, useState } from "react";

export default function DocViewer() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const path = params.get("path");
  const name = params.get("name") || "document";

  useEffect(() => {
    if (!path) {
      setError("Missing document path.");
      setLoading(false);
      return;
    }

    let canceled = false;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${baseUrl}/functions/v1/get-document?path=${encodeURIComponent(path)}&mode=view`
        );
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        const ct = res.headers.get("Content-Type") || "";
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!canceled) {
          setContentType(ct);
          setBlobUrl(objectUrl);
          setLoading(false);
        }
      } catch (err: any) {
        if (!canceled) {
          setError(err.message || "Could not load document.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      canceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (loading) return <div style={{ padding: 24 }}>Loading document...</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>Error: {error}</div>;
  if (!blobUrl) return <div style={{ padding: 24 }}>No document available.</div>;

  const isPdf = (contentType && contentType.includes("pdf")) || name.toLowerCase().endsWith(".pdf");

  return isPdf ? (
    <iframe 
      src={blobUrl} 
      style={{ width: "100vw", height: "100vh", border: "none" }} 
      title={name} 
    />
  ) : (
    <div style={{ padding: 24 }}>
      <p>Preview unavailable for this file type.</p>
      <p>
        <a href={blobUrl} download={name} style={{ color: "blue", textDecoration: "underline" }}>
          Download {name}
        </a>
      </p>
    </div>
  );
}
