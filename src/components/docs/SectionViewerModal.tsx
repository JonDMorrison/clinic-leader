import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SectionViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string | null;
  docId: string | null;
}

interface SectionData {
  section_title: string;
  section_body: string;
  heading_path: string;
  section_type: string;
  doc_title?: string;
}

export const SectionViewerModal = ({
  open,
  onOpenChange,
  sectionId,
  docId,
}: SectionViewerModalProps) => {
  const [section, setSection] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sectionId) {
      setSection(null);
      return;
    }

    const fetchSection = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("doc_sections")
          .select(`
            section_title,
            section_body,
            heading_path,
            section_type,
            docs!inner(title)
          `)
          .eq("id", sectionId)
          .single();

        if (error) throw error;

        setSection({
          section_title: data.section_title,
          section_body: data.section_body,
          heading_path: data.heading_path,
          section_type: data.section_type,
          doc_title: (data.docs as any)?.title,
        });
      } catch (error) {
        console.error("Failed to fetch section:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSection();
  }, [open, sectionId]);

  const pathParts = section?.heading_path?.split(" > ").filter(Boolean) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {section?.doc_title || "SOP Section"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : section ? (
          <div className="space-y-4">
            {/* Breadcrumb path */}
            {pathParts.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
                {pathParts.map((part, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3 w-3" />}
                    <span>{part}</span>
                  </span>
                ))}
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{section.section_title}</span>
              </div>
            )}

            {/* Section type badge */}
            <Badge variant="secondary" className="text-xs">
              {section.section_type.replace(/_/g, " ")}
            </Badge>

            {/* Section content */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{section.section_body}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Section not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
