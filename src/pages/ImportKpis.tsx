import { FileDropZone } from "@/components/imports/FileDropZone";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/hooks/use-toast";

export default function ImportKpis() {
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    try {
      // KPI import logic would go here
      toast({
        title: "KPI Import",
        description: `Processing ${file.name}...`,
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to process KPI import",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          Import KPIs
        </h1>
        <p className="text-muted-foreground">
          Upload KPI definitions and targets for scorecard tracking
        </p>
      </div>

      <FileDropZone
        onFileSelect={handleFileSelect}
        acceptedTypes={[".csv"]}
        label="Upload KPI CSV"
        fileType="kpis"
      />

      <Card className="glass p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">KPI CSV Format</h3>
        <div className="bg-surface/50 p-4 rounded-lg font-mono text-sm mb-4">
          name, category, unit, target, direction, owner_email
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Valid units: number, currency, percentage, hours
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Valid directions: higher, lower
        </p>
        
        <h4 className="font-semibold mb-2 text-sm">Example CSV:</h4>
        <pre className="bg-surface/50 p-4 rounded-lg text-xs overflow-x-auto">
{`name,category,unit,target,direction,owner_email
New Patients,Marketing,number,50,higher,marketing@northwest.com
Collections Rate,Revenue,percentage,95,higher,billing@northwest.com
Patient Satisfaction,Quality,number,4.5,higher,clinical@northwest.com`}
        </pre>
      </Card>
    </div>
  );
}
