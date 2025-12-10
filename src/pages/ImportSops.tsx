import { FileDropZone } from "@/components/imports/FileDropZone";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ImportSops() {
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    try {
      // Document import logic would go here
      toast({
        title: "Document Import",
        description: `Processing ${file.name}...`,
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to process document import",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          Import Documents
        </h1>
        <p className="text-muted-foreground">
          Upload documents including SOPs, policies, and training materials
        </p>
      </div>

      <FileDropZone
        onFileSelect={handleFileSelect}
        acceptedTypes={[".csv", ".md", ".pdf"]}
        label="Upload Document Files"
        fileType="sops"
      />

      <Card className="glass p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Document Import Format</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">CSV Format:</h4>
            <div className="bg-surface/50 p-4 rounded-lg font-mono text-sm mb-2">
              title, kind, body, requires_ack
            </div>
            <p className="text-xs text-muted-foreground">
              Valid kinds: process, policy, checklist, training
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">Markdown Format:</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Upload .md files with frontmatter:
            </p>
            <pre className="bg-surface/50 p-4 rounded-lg text-xs overflow-x-auto">
{`---
title: Patient Intake Process
kind: process
requires_ack: true
---

# Patient Intake Process

1. Greet patient...
2. Verify insurance...`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">Example CSV:</h4>
            <pre className="bg-surface/50 p-4 rounded-lg text-xs overflow-x-auto">
{`title,kind,body,requires_ack
New Patient Intake,process,"Step 1: Greet patient...",true
HIPAA Compliance,policy,"All staff must...",true
Daily Opening Checklist,checklist,"- Unlock doors...",false`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
