import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Playbook, PlaybookStep } from "@/types/playbook";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPlaybook();
    }
  }, [id]);

  const fetchPlaybook = async () => {
    try {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPlaybook(data);
    } catch (error: any) {
      console.error('Error fetching playbook:', error);
      toast.error('Failed to load playbook');
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!playbook?.file_url) {
      toast.error('File URL not available');
      return;
    }

    try {
      // Extract the storage path from the public URL
      const urlParts = playbook.file_url.split('/');
      const bucketIndex = urlParts.indexOf('playbooks');
      if (bucketIndex === -1) {
        throw new Error('Invalid file URL');
      }
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      // Create signed URL (expires in 60 minutes)
      const { data, error } = await supabase.storage
        .from('playbooks')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = playbook.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!playbook) {
    return null;
  }

  const steps = playbook.parsed_steps as PlaybookStep[] | null;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/library')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{playbook.title}</CardTitle>
              {playbook.category && (
                <span className="inline-block px-3 py-1 text-sm rounded-full bg-brand/10 text-brand mb-2">
                  {playbook.category}
                </span>
              )}
              <p className="text-sm text-muted-foreground">
                Updated {formatDistanceToNow(new Date(playbook.updated_at), { addSuffix: true })}
              </p>
            </div>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {playbook.description && (
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground">{playbook.description}</p>
            </div>
          )}

          {steps && steps.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-4">Instructions</h3>
              <ol className="space-y-4">
                {steps
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li key={step.order} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white font-semibold">
                        {step.order}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-base mb-1">{step.text}</p>
                        {step.note && (
                          <p className="text-sm text-muted-foreground italic">
                            Note: {step.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          ) : playbook.parsed_text ? (
            <div>
              <h3 className="font-semibold mb-4">Content</h3>
              <div className="prose prose-sm max-w-none">
                {playbook.parsed_text.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-3 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No extracted content available. Download the PDF to view the full document.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
