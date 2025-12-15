import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Link, useNavigate } from "react-router-dom";
import { computeTemplateHealth } from "@/lib/scorecard/templateHealth";
import { getMonthlyPeriodSelection } from "@/lib/scorecard/periodHelper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  AlertTriangle, 
  FileSpreadsheet,
  Download,
  Copy,
  Link2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Settings2,
  ListChecks
} from "lucide-react";

type StepStatus = 'locked' | 'active' | 'completed';

interface CutoverStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  blocking?: string;
}

export default function ScorecardCutover() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: adminCheck } = useIsAdmin();
  const navigate = useNavigate();
  
  const orgId = currentUser?.team_id;
  
  // Step completion tracking
  const [templateGenerated, setTemplateGenerated] = useState(false);
  const [firstSyncAttempted, setFirstSyncAttempted] = useState(false);

  // Fetch template health
  const { data: templateHealthData, isLoading: healthLoading } = useQuery({
    queryKey: ['template-health', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return await computeTemplateHealth(orgId);
    },
    enabled: !!orgId,
  });

  // Fetch import config
  const { data: importConfig, isLoading: configLoading } = useQuery({
    queryKey: ['scorecard-import-config', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('scorecard_import_configs')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch period selection for off-track link
  const { data: periodSelection } = useQuery({
    queryKey: ['monthly-period-selection', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      return await getMonthlyPeriodSelection(orgId);
    },
    enabled: !!orgId,
  });

  const health = templateHealthData?.health;
  const metrics = templateHealthData?.metrics || [];
  
  const isTemplateReady = health?.isReady ?? false;
  const hasDuplicates = (health?.duplicate_metric_names_count ?? 0) > 0;
  const hasSheetConnected = !!importConfig?.sheet_id;
  const hasSyncedData = !!(importConfig?.last_synced_at && importConfig?.last_synced_month);
  const hasUnmatchedOnLastSync = false; // Would need to store this in config

  // Derive step statuses
  const getStepStatus = (stepIndex: number): StepStatus => {
    switch (stepIndex) {
      case 0: // Template Health
        return isTemplateReady ? 'completed' : 'active';
      case 1: // Resolve Duplicates
        if (!isTemplateReady) return 'locked';
        return hasDuplicates ? 'active' : 'completed';
      case 2: // Generate Template
        if (!isTemplateReady || hasDuplicates) return 'locked';
        return templateGenerated ? 'completed' : 'active';
      case 3: // Connect Google Sheet
        if (!isTemplateReady || hasDuplicates) return 'locked';
        return hasSheetConnected ? 'completed' : 'active';
      case 4: // First Sync
        if (!hasSheetConnected) return 'locked';
        return hasSyncedData ? 'completed' : 'active';
      case 5: // Review Off-Track
        if (!hasSyncedData) return 'locked';
        return 'active'; // Always active once sync is done
      default:
        return 'locked';
    }
  };

  const steps: CutoverStep[] = [
    {
      id: 'template-health',
      title: 'Template Health',
      description: 'Ensure all metrics have import keys and no duplicates exist',
      status: getStepStatus(0),
      blocking: !isTemplateReady ? `${health?.missing_import_keys_count ?? 0} missing keys, ${health?.duplicate_import_keys_count ?? 0} duplicate keys` : undefined,
    },
    {
      id: 'resolve-duplicates',
      title: 'Resolve Duplicates',
      description: 'Archive duplicate metric names to prevent ambiguity',
      status: getStepStatus(1),
      blocking: hasDuplicates ? `${health?.duplicate_metric_names_count ?? 0} duplicate metric names` : undefined,
    },
    {
      id: 'generate-template',
      title: 'Generate Template',
      description: 'Download or copy the canonical CSV template for your sheet',
      status: getStepStatus(2),
    },
    {
      id: 'connect-sheet',
      title: 'Connect Google Sheet',
      description: 'Paste your Google Sheet link and tab name',
      status: getStepStatus(3),
    },
    {
      id: 'first-sync',
      title: 'First Sync',
      description: 'Sync data from your sheet and review results',
      status: getStepStatus(4),
    },
    {
      id: 'review-offtrack',
      title: 'Review Off-Track',
      description: 'Set missing targets and owners, create issues',
      status: getStepStatus(5),
    },
  ];

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const isCutoverComplete = hasSyncedData && isTemplateReady && hasSheetConnected;

  // Generate CSV template
  const handleDownloadTemplate = () => {
    const header = "metric_key,metric_name,value,month";
    const rows = metrics
      .filter(m => m.import_key)
      .map(m => `"${m.import_key}","${m.name.replace(/"/g, '""')}","",""`);
    const csv = [header, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Scorecard_Input.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    setTemplateGenerated(true);
    toast.success("Template downloaded");
  };

  const handleCopyTemplate = () => {
    const header = "metric_key,metric_name,value,month";
    const rows = metrics
      .filter(m => m.import_key)
      .map(m => `"${m.import_key}","${m.name.replace(/"/g, '""')}","",""`);
    const csv = [header, ...rows].join('\n');
    
    navigator.clipboard.writeText(csv);
    setTemplateGenerated(true);
    toast.success("Template copied to clipboard");
  };

  const renderStepIcon = (status: StepStatus, index: number) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'active':
        return <Circle className="w-6 h-6 text-brand fill-brand/10" />;
      case 'locked':
        return <Lock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const renderStepContent = (step: CutoverStep, index: number) => {
    const isLocked = step.status === 'locked';
    
    switch (step.id) {
      case 'template-health':
        return (
          <div className="space-y-3">
            {step.blocking && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{step.blocking}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">
                {health?.total_active_metrics ?? 0} active metrics
              </Badge>
              <Badge variant={health?.missing_import_keys_count ? "destructive" : "outline"} className={health?.missing_import_keys_count ? "" : "border-success text-success"}>
                {health?.missing_import_keys_count ?? 0} missing keys
              </Badge>
              <Badge variant={health?.duplicate_import_keys_count ? "destructive" : "outline"} className={health?.duplicate_import_keys_count ? "" : "border-success text-success"}>
                {health?.duplicate_import_keys_count ?? 0} duplicate keys
              </Badge>
            </div>
            <Button asChild variant={isTemplateReady ? "outline" : "default"}>
              <Link to="/scorecard/template">
                <Settings2 className="w-4 h-4 mr-2" />
                {isTemplateReady ? "View Template" : "Go Assign Keys"}
              </Link>
            </Button>
          </div>
        );

      case 'resolve-duplicates':
        return (
          <div className="space-y-3">
            {step.blocking ? (
              <>
                <Alert className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{step.blocking}</AlertDescription>
                </Alert>
                <Button asChild>
                  <Link to="/scorecard/template#duplicates">
                    <ListChecks className="w-4 h-4 mr-2" />
                    Resolve Duplicates
                  </Link>
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                No duplicates
              </Badge>
            )}
          </div>
        );

      case 'generate-template':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate a CSV with all your metric keys pre-filled. Copy into your Google Sheet.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadTemplate} 
                disabled={isLocked}
                variant={templateGenerated ? "outline" : "default"}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
              <Button 
                onClick={handleCopyTemplate} 
                disabled={isLocked}
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy CSV
              </Button>
            </div>
            {templateGenerated && (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Template generated
              </Badge>
            )}
          </div>
        );

      case 'connect-sheet':
        return (
          <div className="space-y-3">
            {hasSheetConnected ? (
              <div className="space-y-2">
                <Badge variant="outline" className="border-success text-success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Sheet connected
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Tab: <code className="bg-muted px-1 rounded">{importConfig?.tab_name || 'Scorecard_Input'}</code>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure your Google Sheet connection on the template page.
              </p>
            )}
            <Button asChild variant={hasSheetConnected ? "outline" : "default"} disabled={isLocked}>
              <Link to="/scorecard/template#google-sheet">
                <Link2 className="w-4 h-4 mr-2" />
                {hasSheetConnected ? "Edit Configuration" : "Connect Sheet"}
              </Link>
            </Button>
          </div>
        );

      case 'first-sync':
        return (
          <div className="space-y-3">
            {hasSyncedData ? (
              <div className="space-y-2">
                <Badge variant="outline" className="border-success text-success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Data synced
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Last sync: {importConfig?.last_synced_month}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run your first sync to import monthly data.
              </p>
            )}
            <Button asChild variant={hasSyncedData ? "outline" : "default"} disabled={isLocked}>
              <Link to="/scorecard/template#google-sheet">
                <RefreshCw className="w-4 h-4 mr-2" />
                {hasSyncedData ? "Sync Again" : "Sync Now"}
              </Link>
            </Button>
            {!hasSyncedData && hasSheetConnected && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  If sync shows unmatched keys, fix your sheet's metric_key values to match template keys.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'review-offtrack':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review metrics that need attention: missing targets, owners, or off-track values.
            </p>
            <Button 
              asChild 
              variant="default" 
              disabled={isLocked}
              className={!isLocked ? "gradient-brand" : ""}
            >
              <Link to={`/scorecard/off-track${periodSelection?.selectedPeriodKey ? `?month=${periodSelection.selectedPeriodKey}` : ''}`}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Off-Track for {periodSelection?.periodLabel || 'this month'}
              </Link>
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (userLoading || healthLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        <p className="text-muted-foreground mt-2">Loading cutover checklist...</p>
      </div>
    );
  }

  if (!adminCheck?.isAdmin && !adminCheck?.isManager) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This page is only accessible to admins and managers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Scorecard Cutover</h1>
        <p className="text-muted-foreground">
          Complete these steps to set up your monthly scorecard sync. Estimated time: 30 minutes.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{completedSteps} of {steps.length} steps completed</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {isCutoverComplete && (
            <div className="mt-4 flex items-center gap-2 text-success">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Cutover complete! Your scorecard is ready for monthly syncs.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={step.status === 'locked' ? 'opacity-60' : ''}
          >
            <CardContent className="py-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">
                  {renderStepIcon(step.status, index)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    {step.status === 'completed' && (
                      <Badge variant="outline" className="border-success text-success text-xs">
                        Done
                      </Badge>
                    )}
                    {step.status === 'locked' && (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.status !== 'locked' && (
                    <>
                      <Separator className="my-3" />
                      {renderStepContent(step, index)}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/scorecard/template">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Template Manager
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/scorecard/off-track">
                <ListChecks className="w-4 h-4 mr-2" />
                Off-Track View
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/scorecard">
                <ArrowRight className="w-4 h-4 mr-2" />
                Scorecard Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
