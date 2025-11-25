import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, X, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { NWIC_USER_MANUAL } from "@/lib/docs/manuals/nwicUserManual";
import { cn } from "@/lib/utils";

interface UserManualViewerProps {
  open: boolean;
  onClose: () => void;
}

export function UserManualViewer({ open, onClose }: UserManualViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Extract sections from markdown
  const sections = useMemo(() => {
    const lines = NWIC_USER_MANUAL.split("\n");
    const result: { id: string; title: string; level: number; content: string }[] = [];
    let currentSection: { id: string; title: string; level: number; content: string } | null = null;

    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        if (currentSection) {
          result.push(currentSection);
        }
        const level = match[1].length;
        const title = match[2];
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        currentSection = { id, title, level, content: line + "\n" };
      } else if (currentSection) {
        currentSection.content += line + "\n";
      }
    });

    if (currentSection) {
      result.push(currentSection);
    }

    return result;
  }, []);

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.content.toLowerCase().includes(query),
    );
  }, [sections, searchQuery]);

  // Get chapter sections (level 2)
  const chapters = sections.filter((s) => s.level === 2);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-brand" />
              <DialogTitle className="text-2xl">ClinicLeader User Manual</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Table of Contents Sidebar */}
          <div className="w-64 border-r bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Table of Contents
                </p>
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => handleSectionClick(chapter.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      activeSection === chapter.id && "bg-brand/10 text-brand font-medium",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      <span className="truncate">{chapter.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-4xl mx-auto">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">No results found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try adjusting your search query
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {filteredSections.map((section) => (
                    <div key={section.id} id={`section-${section.id}`} className="mb-8">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-4xl font-bold text-foreground mb-4 border-b pb-4">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-3xl font-bold text-foreground mt-8 mb-4">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-2xl font-semibold text-foreground mt-6 mb-3">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-foreground leading-relaxed mb-4">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-2 mb-4 text-foreground">
                              {children}
                            </ol>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes("language-");
                            if (isBlock) {
                              return (
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                                  <code className="text-sm text-foreground">{children}</code>
                                </pre>
                              );
                            }
                            return (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-brand">
                                {children}
                              </code>
                            );
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-brand pl-4 italic text-muted-foreground mb-4">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
