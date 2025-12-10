import { useState } from "react";
import { EMPLOYEE_MANUAL, searchManual } from "@/lib/docs/manuals/employeeManual";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, BookOpen, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface EmployeeManualViewerProps {
  open: boolean;
  onClose: () => void;
}

export const EmployeeManualViewer = ({ open, onClose }: EmployeeManualViewerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const [showAIHelp, setShowAIHelp] = useState(false);

  const searchResults = searchQuery.trim() ? searchManual(searchQuery) : [];
  const showingSearch = searchResults.length > 0;

  const toggleSection = (index: number) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenSections(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="glass p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{EMPLOYEE_MANUAL.title}</DialogTitle>
                <div className="flex gap-2 mt-2">
                  {EMPLOYEE_MANUAL.tags.map((tag) => (
                    <Badge key={tag} variant="muted" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIHelp(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              AI Ask
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-white/20"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showingSearch ? (
            // Search Results
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </h3>
              {searchResults.map((result, idx) => (
                <Card key={idx} className="border-white/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{result.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{result.section}</p>
                      </div>
                      <Badge variant="brand" className="text-xs">
                        {result.relevance.toFixed(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-extrabold prose-strong:font-extrabold prose-ul:list-disc prose-ul:pl-4 prose-li:text-foreground/80 text-foreground/80">
                      <ReactMarkdown>{result.body}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Full Manual Sections
            <div className="space-y-4">
              {EMPLOYEE_MANUAL.sections.map((section, sectionIdx) => {
                const isOpen = openSections.has(sectionIdx);
                return (
                  <Collapsible
                    key={sectionIdx}
                    open={isOpen}
                    onOpenChange={() => toggleSection(sectionIdx)}
                  >
                    <Card className="border-white/10 overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="hover:bg-white/5 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3 text-left">
                              {isOpen ? (
                                <ChevronDown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                              )}
                              <div>
                                <CardTitle className="text-lg">{section.heading}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {section.summary}
                                </p>
                              </div>
                            </div>
                            <Badge variant="muted" className="text-xs shrink-0">
                              {section.items.length} items
                            </Badge>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {section.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="p-4 rounded-xl glass border border-white/10"
                            >
                              <h4 className="font-medium text-foreground mb-2">{item.title}</h4>
                              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-extrabold prose-strong:font-extrabold prose-ul:list-disc prose-ul:pl-4 prose-li:text-muted-foreground text-muted-foreground leading-relaxed">
                                <ReactMarkdown>{item.body}</ReactMarkdown>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Help Modal */}
        <Dialog open={showAIHelp} onOpenChange={setShowAIHelp}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Assistant
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask me anything about the Employee Manual and I'll help you find the right information.
              </p>
              <Input
                placeholder="e.g., What's the protocol for scheduling IME appointments?"
                className="glass border-white/20"
              />
              <div className="glass rounded-xl p-4 border border-white/10">
                <p className="text-sm text-muted-foreground">
                  AI-powered contextual help coming soon. This will use the manual content to provide
                  accurate answers to your questions.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
