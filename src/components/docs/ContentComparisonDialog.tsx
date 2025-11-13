import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileText } from "lucide-react";

interface ContentComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldContent: {
    title: string;
    body: string;
    kind: string;
  };
  newContent: {
    title: string;
    body: string;
    suggestedType: string;
  };
  filename: string;
}

export const ContentComparisonDialog = ({
  open,
  onClose,
  onConfirm,
  oldContent,
  newContent,
  filename,
}: ContentComparisonDialogProps) => {
  const hasChanges = 
    oldContent.title !== newContent.title ||
    oldContent.body !== newContent.body ||
    oldContent.kind !== newContent.suggestedType;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Content Re-Extraction Complete
          </DialogTitle>
          <DialogDescription>
            New content has been extracted from <span className="font-medium">{filename}</span>. 
            Review the changes before applying them to your document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Title Comparison */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Title</h4>
                  {oldContent.title !== newContent.title && (
                    <Badge variant="secondary" className="text-xs">Changed</Badge>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <div className="p-3 rounded-md bg-muted/50 border">
                      <p className="text-sm">{oldContent.title || <span className="text-muted-foreground italic">Empty</span>}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-6" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">New</p>
                    <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium">{newContent.title}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Comparison */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Document Type</h4>
                  {oldContent.kind !== newContent.suggestedType && (
                    <Badge variant="secondary" className="text-xs">Changed</Badge>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <div className="p-3 rounded-md bg-muted/50 border">
                      <Badge variant="outline">{oldContent.kind}</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-6" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">New</p>
                    <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                      <Badge>{newContent.suggestedType}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Comparison */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Content</h4>
                  {oldContent.body !== newContent.body && (
                    <Badge variant="secondary" className="text-xs">Changed</Badge>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current ({oldContent.body.length} chars)</p>
                    <ScrollArea className="h-48">
                      <div className="p-3 rounded-md bg-muted/50 border">
                        <p className="text-sm whitespace-pre-wrap">{oldContent.body || <span className="text-muted-foreground italic">Empty</span>}</p>
                      </div>
                    </ScrollArea>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-6" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">New ({newContent.body.length} chars)</p>
                    <ScrollArea className="h-48">
                      <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                        <p className="text-sm whitespace-pre-wrap font-medium">{newContent.body}</p>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel & Keep Current
          </Button>
          <Button onClick={onConfirm}>
            Apply New Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
