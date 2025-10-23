import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, BookOpen, CheckCircle2 } from "lucide-react";
import { SYSTEM_HANDBOOK } from "@/lib/docs/training/systemHandbook";
import ReactMarkdown from "react-markdown";

interface HandbookViewerProps {
  open: boolean;
  onClose: () => void;
}

export const HandbookViewer = ({ open, onClose }: HandbookViewerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["getting-started"]);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const markSectionComplete = (sectionId: string) => {
    setCompletedSections((prev) =>
      prev.includes(sectionId)
        ? prev
        : [...prev, sectionId]
    );
  };

  const searchResults = searchQuery
    ? SYSTEM_HANDBOOK.sections.flatMap((section) =>
        section.content
          .filter(
            (item) =>
              item.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.body.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((item) => ({ section: section.title, ...item }))
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" />
            {SYSTEM_HANDBOOK.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Version {SYSTEM_HANDBOOK.version} • Last updated {SYSTEM_HANDBOOK.lastUpdated}
          </p>
        </DialogHeader>

        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search handbook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          {searchQuery ? (
            <div className="py-4 space-y-4">
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No results found for "{searchQuery}"
                </p>
              ) : (
                searchResults.map((result, index) => (
                  <Card key={index} className="p-4">
                  <Badge variant="muted" className="mb-2">
                    {result.section}
                  </Badge>
                    <h4 className="font-semibold mb-2">{result.heading}</h4>
                    <div className="prose prose-sm text-muted-foreground">
                      <ReactMarkdown>{result.body.substring(0, 200) + "..."}</ReactMarkdown>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="py-4 space-y-2">
              {SYSTEM_HANDBOOK.sections.map((section) => {
                const isOpen = openSections.includes(section.id);
                const isComplete = completedSections.includes(section.id);

                return (
                  <Collapsible
                    key={section.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
                          <div className="flex items-center gap-3">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{section.title}</span>
                          </div>
                          {isComplete && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4 border-t pt-4 max-h-96 overflow-y-auto">
                          {section.content.map((item, index) => (
                            <div key={index}>
                              <h4 className="font-semibold mb-2">{item.heading}</h4>
                              <div className="prose prose-sm text-muted-foreground">
                                <ReactMarkdown>{item.body}</ReactMarkdown>
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markSectionComplete(section.id)}
                            disabled={isComplete}
                            className="mt-4"
                          >
                            {isComplete ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Completed
                              </>
                            ) : (
                              "Mark as Complete"
                            )}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/30 flex-shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            Complete training progress: {completedSections.length} of {SYSTEM_HANDBOOK.sections.length} sections
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
