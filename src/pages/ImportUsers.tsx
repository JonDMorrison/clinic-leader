import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ImportUsers() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Import logic will be implemented when ready
      toast({
        title: "Import Ready",
        description: "User import functionality will be activated once the staff list is finalized.",
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to process user import",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          Import Users
        </h1>
        <p className="text-muted-foreground">
          Upload a CSV file to bulk import users into Northwest Injury Clinics
        </p>
      </div>

      <Alert className="mb-6 glass border-warning/50 bg-warning/5">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription>
          Awaiting final staff list. Upload CSV when ready. User import is
          currently disabled until the complete roster is provided.
        </AlertDescription>
      </Alert>

      <Card className="glass p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">CSV Format Requirements</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your CSV file should include the following columns:
            </p>
            <div className="bg-surface/50 p-4 rounded-lg font-mono text-sm">
              email, full_name, role, department
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Valid roles: owner, director, manager, provider, staff, billing
            </p>
            <p className="text-xs text-muted-foreground">
              Valid departments: Front Desk, Clinical – Chiropractic, Clinical –
              Mid-Level, Massage, Billing, Management
            </p>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand/50 transition-colors">
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={isProcessing}
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {file ? file.name : "Click to upload CSV"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or drag and drop
                </p>
              </div>
            </label>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Import Users (Disabled)"}
          </Button>
        </div>
      </Card>

      <Card className="glass p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Example CSV</h3>
        <pre className="bg-surface/50 p-4 rounded-lg text-xs overflow-x-auto">
{`email,full_name,role,department
john.doe@northwest.com,John Doe,director,Management
jane.smith@northwest.com,Jane Smith,provider,Clinical – Chiropractic
admin@northwest.com,Admin User,owner,Management`}
        </pre>
      </Card>
    </div>
  );
}
