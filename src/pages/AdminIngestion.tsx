import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, AlertCircle, CheckCircle, Clock, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminIngestion() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [processing, setProcessing] = useState(false);

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
                    <Badge variant="outline">{doc.mime_type || doc.kind}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(doc.extract_status)}</TableCell>
                  <TableCell>
                    {doc.word_count ? doc.word_count.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {doc.extract_source || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.extracted_at
                      ? new Date(doc.extracted_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {doc.extract_error || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReExtract(doc.id, doc.storage_path!)}
                      disabled={processing}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Re-extract
                    </Button>
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
