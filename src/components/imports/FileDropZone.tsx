import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FileDropZoneProps {
  onFileSelect: (file: File, type: string) => Promise<void>;
  acceptedTypes: string[];
  label: string;
  fileType: string;
}

export const FileDropZone = ({ onFileSelect, acceptedTypes, label, fileType }: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      if (!file) return;

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(`.${fileExtension}`)) {
        toast.error(`Invalid file type. Expected: ${acceptedTypes.join(', ')}`);
        return;
      }

      setIsProcessing(true);
      setStatus('idle');

      try {
        await onFileSelect(file, fileType);
        setStatus('success');
        toast.success(`${label} imported successfully`);
      } catch (error: any) {
        setStatus('error');
        toast.error(error.message || 'Import failed');
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileSelect, acceptedTypes, label, fileType]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setStatus('idle');

      try {
        await onFileSelect(file, fileType);
        setStatus('success');
        toast.success(`${label} imported successfully`);
      } catch (error: any) {
        setStatus('error');
        toast.error(error.message || 'Import failed');
      } finally {
        setIsProcessing(false);
      }

      e.target.value = '';
    },
    [onFileSelect, label, fileType]
  );

  return (
    <div
      className={`cursor-pointer transition-all rounded-lg border p-6 ${
        isDragging
          ? 'border-brand bg-brand/5'
          : status === 'success'
          ? 'border-success bg-success/5'
          : status === 'error'
          ? 'border-danger bg-danger/5'
          : 'border-border hover:border-brand/50 bg-card'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center gap-3 cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="w-12 h-12 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 className="w-12 h-12 text-success" />
        ) : status === 'error' ? (
          <AlertCircle className="w-12 h-12 text-danger" />
        ) : (
          <Upload className="w-12 h-12 text-muted-foreground" />
        )}

        <div className="text-center">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {acceptedTypes.join(', ')} files
          </p>
        </div>

        {status === 'idle' && (
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to select
          </p>
        )}
      </label>
    </div>
  );
};
