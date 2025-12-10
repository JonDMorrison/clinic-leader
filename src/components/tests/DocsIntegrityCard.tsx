import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, BookOpen } from "lucide-react";

interface DocsIntegrityResult {
  success: boolean;
  checks: {
    sops_loaded: boolean;
    sections_render: boolean;
    ai_search_works: boolean;
    ack_system_works: boolean;
    quiz_scoring_works: boolean;
  };
  details: {
    total_docs: number;
    sop_count: number;
    manual_count: number;
    training_count: number;
    sections_found: number;
    search_accuracy: number;
  };
  issues: string[];
  timestamp: string;
}

export function DocsIntegrityCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocsIntegrityResult | null>(null);

  const runIntegrityCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("docs-integrity");

      if (error) throw error;

      setResult(data);

      const allPassed = Object.values(data.checks).every((v) => v === true);
      if (allPassed && data.issues.length === 0) {
        toast.success("All docs integrity checks passed!");
      } else {
        toast.warning("Some docs integrity checks failed");
      }
    } catch (error: any) {
      console.error("Docs integrity check failed:", error);
      toast.error(`Integrity check failed: ${error.message}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle2 className="h-5 w-5 text-success" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    );
  };

  const getCheckLabel = (key: string) => {
    const labels: Record<string, string> = {
      sops_loaded: "SOPs Loaded",
      sections_render: "Sections Render",
      ai_search_works: "AI Search Works",
      ack_system_works: "Acknowledgment System",
      quiz_scoring_works: "Quiz Scoring",
    };
    return labels[key] || key;
  };

  return (
    <Card className="glass">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Document System Integrity</h2>
              <p className="text-sm text-muted-foreground">
                Validate document system, AI search, and acknowledgment workflows
              </p>
            </div>
          </div>
          <Button
            onClick={runIntegrityCheck}
            disabled={loading}
            size="sm"
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Testing...
              </>
            ) : (
              "Run Document Test"
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{result.details.total_docs}</div>
                <div className="text-xs text-muted-foreground">Total Docs</div>
              </div>
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{result.details.sop_count}</div>
                <div className="text-xs text-muted-foreground">SOPs</div>
              </div>
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{result.details.sections_found}</div>
                <div className="text-xs text-muted-foreground">Sections</div>
              </div>
              <div className="bg-surface/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{result.details.search_accuracy}%</div>
                <div className="text-xs text-muted-foreground">Search Accuracy</div>
              </div>
            </div>

            {/* System Checks */}
            <div>
              <h3 className="text-sm font-medium mb-3">System Checks</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.checks).map(([key, passed]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 bg-surface/30 rounded-lg p-3"
                  >
                    {getCheckIcon(passed)}
                    <span className="text-sm">{getCheckLabel(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Breakdown */}
            <div>
              <h3 className="text-sm font-medium mb-3">Document Types</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-surface/30 rounded-lg p-3">
                  <span className="text-sm">Standard Operating Procedures</span>
                  <Badge variant="brand">{result.details.sop_count}</Badge>
                </div>
                <div className="flex items-center justify-between bg-surface/30 rounded-lg p-3">
                  <span className="text-sm">Employee Manuals</span>
                  <Badge variant="success">{result.details.manual_count}</Badge>
                </div>
                <div className="flex items-center justify-between bg-surface/30 rounded-lg p-3">
                  <span className="text-sm">Training Materials</span>
                  <Badge variant="warning">{result.details.training_count}</Badge>
                </div>
              </div>
            </div>

            {/* Issues */}
            {result.issues.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 text-destructive">Issues Found</h3>
                <div className="space-y-2">
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3"
                    >
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-destructive">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.issues.length === 0 && (
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-sm text-success font-medium">
                  All docs integrity tests passed ✅
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-right">
              Last checked: {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Document Test" to validate documentation system</p>
          </div>
        )}
      </div>
    </Card>
  );
}
