import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ConfirmationStepProps {
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  metrics?: Array<{ name: string; category: string; unit: string; target: number | null }>;
}

// Generate import key from metric name
const generateImportKey = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
};

export const ConfirmationStep = ({
  onSubmit,
  onBack,
  isSubmitting,
  metrics = [],
}: ConfirmationStepProps) => {
  const [copied, setCopied] = useState(false);

  const generateTemplateCSV = () => {
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...metrics.map(m => [
        generateImportKey(m.name),
        m.name,
        '',
        ''
      ])
    ];
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const downloadTemplate = () => {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Scorecard_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...metrics.map(m => [
        generateImportKey(m.name),
        m.name,
        '',
        ''
      ])
    ];
    const tsv = rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-center">You're All Set!</CardTitle>
          <p className="text-muted-foreground text-center">
            Ready to start tracking your clinic's performance?
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3 text-muted-foreground">
            <p>✓ Your metrics have been configured</p>
            <p>✓ Weekly tracking structure is ready</p>
            <p>✓ Team members can start entering data</p>
          </div>

          {/* Template Download Section */}
          {metrics.length > 0 && (
            <div className="border-t pt-6 mt-6">
              <h4 className="font-semibold text-foreground mb-3">Download Your Template</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Get a CSV template with your selected metrics for Excel or Google Sheets
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy for Sheets
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="pt-6">
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              size="lg"
              className="gradient-brand px-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
      </div>
    </div>
  );
};
