import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAYBOOK_CATEGORIES } from "@/types/playbook";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadPlaybookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  organizationId: string;
  userId: string;
}

interface ParsedMetadata {
  title: string;
  summary: string;
  category: string;
  steps: Array<{ order: number; text: string; note?: string }>;
}

export const UploadPlaybookModal = ({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  userId
}: UploadPlaybookModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [steps, setSteps] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.pdf$/i, ''));

    // Extract and parse with AI
    await extractAndParse(selectedFile);
  };

  const extractAndParse = async (pdfFile: File) => {
    setExtracting(true);
    try {
      // First upload the file temporarily
      const tempPath = `${organizationId}/temp_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('playbooks')
        .upload(tempPath, pdfFile);

      if (uploadError) throw uploadError;

      // Extract text
      const { data: extractData, error: extractError } = await supabase.functions.invoke('pdf-extract', {
        body: { file_path: tempPath, organization_id: organizationId }
      });

      if (extractError) throw extractError;

      const extractedText = extractData?.text || '';

      if (!extractedText || extractedText.length < 20) {
        toast.info('Could not extract text from PDF. Please enter details manually.');
        // Clean up temp file
        await supabase.storage.from('playbooks').remove([tempPath]);
        setExtracting(false);
        return;
      }

      // Parse with AI
      const { data: parseData, error: parseError } = await supabase.functions.invoke('playbook-ai-parse', {
        body: { text: extractedText, filename: pdfFile.name }
      });

      if (parseError) throw parseError;

      const parsed: ParsedMetadata = parseData;

      // Populate form fields
      setTitle(parsed.title || pdfFile.name.replace(/\.pdf$/i, ''));
      setDescription(parsed.summary || '');
      setCategory(parsed.category || '');
      
      if (parsed.steps && parsed.steps.length > 0) {
        setSteps(JSON.stringify(parsed.steps, null, 2));
      }

      // Clean up temp file
      await supabase.storage.from('playbooks').remove([tempPath]);

      toast.success('AI suggestions ready! Review and adjust as needed.');

    } catch (error) {
      console.error('Error extracting/parsing:', error);
      toast.error('Failed to process PDF. You can still upload manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error('Please select a file and enter a title');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('playbooks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('playbooks')
        .getPublicUrl(fileName);

      // Parse steps JSON if provided
      let parsedSteps = null;
      if (steps.trim()) {
        try {
          parsedSteps = JSON.parse(steps);
        } catch (e) {
          toast.error('Invalid steps JSON format');
          setUploading(false);
          return;
        }
      }

      // Create database record
      const { error: dbError } = await supabase
        .from('playbooks')
        .insert({
          organization_id: organizationId,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          filename: file.name,
          file_url: publicUrl,
          parsed_steps: parsedSteps,
          uploaded_by: userId
        });

      if (dbError) throw dbError;

      toast.success('Playbook uploaded successfully');
      onSuccess();
      onOpenChange(false);
      resetForm();

    } catch (error: any) {
      console.error('Error uploading playbook:', error);
      toast.error(error.message || 'Failed to upload playbook');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setSteps("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Playbook</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file">PDF File *</Label>
            <Input
              id="file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading || extracting}
            />
            {extracting && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <Sparkles className="h-4 w-4 text-accent" />
                <span>AI is analyzing your PDF...</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter playbook title"
              disabled={uploading}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Summary (200 chars)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Brief summary of the playbook"
              disabled={uploading}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/200
            </p>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PLAYBOOK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="steps">Steps (JSON format - optional)</Label>
            <Textarea
              id="steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder='[{"order": 1, "text": "Step description", "note": "Optional note"}]'
              disabled={uploading}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file || !title.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
