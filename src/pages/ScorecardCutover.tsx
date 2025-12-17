import { Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCutoverReadiness } from "@/hooks/useCutoverReadiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowRight,
  Loader2,
  ShieldCheck,
  Settings2,
  ListChecks,
  Upload,
  Map,
  CalendarPlus,
  Sparkles,
  PartyPopper,
} from "lucide-react";

type StepStatus = 'pending' | 'active' | 'completed' | 'needs_attention';

interface CutoverStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  blocking?: string;
}

export default function ScorecardCutover() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: adminCheck, isLoading: adminLoading } = useIsAdmin();
  const { cutoverStatus, isLoading: statusLoading, markReady, isMarkingReady, refetch } = useCutoverReadiness();

  const isLoading = userLoading || statusLoading || adminLoading;

  // Derive step statuses from cutover status
  const getStepStatus = (stepIndex: number): StepStatus => {
    switch (stepIndex) {
      case 0: // Template Keys
        return cutoverStatus.templateKeysReady ? 'completed' : 'needs_attention';
      case 1: // Duplicates
        if (!cutoverStatus.templateKeysReady) return 'pending';
        return cutoverStatus.duplicatesResolved ? 'completed' : 'needs_attention';
      case 2: // Monthly Data
        if (!cutoverStatus.templateKeysReady || !cutoverStatus.duplicatesResolved) return 'pending';
        return cutoverStatus.monthlyDataLoaded ? 'completed' : 'active';
      case 3: // VTO Mapping
        if (!cutoverStatus.templateKeysReady || !cutoverStatus.duplicatesResolved) return 'pending';
        return cutoverStatus.vtoMapped ? 'completed' : 'active';
      case 4: // Meeting Ready
        if (!cutoverStatus.templateKeysReady || !cutoverStatus.duplicatesResolved || !cutoverStatus.monthlyDataLoaded) return 'pending';
        return cutoverStatus.meetingReady ? 'completed' : 'active';
      default:
        return 'pending';
    }
  };

  const steps: CutoverStep[] = [
    {
      id: 'template-keys',
      title: 'Scorecard Template Keys',
      description: 'All active metrics must have a unique import_key for data mapping',
      status: getStepStatus(0),
      blocking: !cutoverStatus.templateKeysReady 
        ? `${cutoverStatus.missingKeyCount} missing keys, ${cutoverStatus.duplicateKeyCount} duplicate keys` 
        : undefined,
    },
    {
      id: 'duplicates-resolved',
      title: 'Duplicates Resolved',
      description: 'No duplicate active metric names to prevent ambiguity',
      status: getStepStatus(1),
      blocking: !cutoverStatus.duplicatesResolved 
        ? `${cutoverStatus.duplicateNameCount} duplicate metric names` 
        : undefined,
    },
    {
      id: 'monthly-data',
      title: 'Monthly Data Loaded',
      description: `At least ${cutoverStatus.minimumRequired} metrics with monthly data`,
      status: getStepStatus(2),
      blocking: !cutoverStatus.monthlyDataLoaded 
        ? `${cutoverStatus.metricsWithDataCount}/${cutoverStatus.minimumRequired} metrics have data` 
        : undefined,
    },
    {
      id: 'vto-mapped',
      title: 'VTO Measurables Mapped',
      description: 'Link VTO goals to existing scorecard metrics',
      status: getStepStatus(3),
      blocking: !cutoverStatus.vtoMapped && cutoverStatus.totalMeasurablesCount > 0
        ? `${cutoverStatus.unmappedMeasurablesCount} unmapped measurables`
        : undefined,
    },
    {
      id: 'meeting-ready',
      title: 'Meeting System Ready',
      description: 'At least one upcoming meeting scheduled',
      status: getStepStatus(4),
      blocking: !cutoverStatus.meetingReady 
        ? 'No upcoming meetings' 
        : undefined,
    },
  ];

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / steps.length) * 100;

  const handleMarkReady = () => {
    markReady();
    toast.success("Scorecard marked as ready!");
  };

  const renderStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'active':
        return <Circle className="w-6 h-6 text-brand fill-brand/10" />;
      case 'needs_attention':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'pending':
        return <Lock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const renderStepContent = (step: CutoverStep) => {
    const isPending = step.status === 'pending';

    switch (step.id) {
      case 'template-keys':
        return (
          <div className="space-y-3">
            {step.blocking && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{step.blocking}</AlertDescription>
              </Alert>
            )}
            {step.status === 'completed' && (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                All keys assigned
              </Badge>
            )}
            <Button asChild variant={step.status === 'completed' ? "outline" : "default"}>
              <Link to="/scorecard/template">
                <Settings2 className="w-4 h-4 mr-2" />
                {step.status === 'completed' ? "View Template" : "Assign Import Keys"}
              </Link>
            </Button>
          </div>
        );

      case 'duplicates-resolved':
        return (
          <div className="space-y-3">
            {step.blocking ? (
              <>
                <Alert className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{step.blocking}</AlertDescription>
                </Alert>
                <Button asChild disabled={isPending}>
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

      case 'monthly-data':
        return (
          <div className="space-y-3">
            {step.status === 'completed' ? (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {cutoverStatus.metricsWithDataCount} metrics have data
              </Badge>
            ) : (
              <>
                {step.blocking && (
                  <Alert className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{step.blocking}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  Import monthly data from CSV, Excel, or Google Sheets.
                </p>
              </>
            )}
            <Button asChild variant={step.status === 'completed' ? "outline" : "default"} disabled={isPending}>
              <Link to="/imports/monthly-report">
                <Upload className="w-4 h-4 mr-2" />
                {step.status === 'completed' ? "Import More Data" : "Import Monthly Data"}
              </Link>
            </Button>
          </div>
        );

      case 'vto-mapped':
        return (
          <div className="space-y-3">
            {cutoverStatus.totalMeasurablesCount === 0 ? (
              <Badge variant="outline" className="text-muted-foreground">
                No VTO measurables to map (optional)
              </Badge>
            ) : step.status === 'completed' ? (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                VTO goals linked to metrics
              </Badge>
            ) : (
              <>
                {step.blocking && (
                  <Alert className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{step.blocking}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  Map your VTO goals to existing scorecard metrics (no new metrics created).
                </p>
              </>
            )}
            <Button asChild variant={step.status === 'completed' ? "outline" : "default"} disabled={isPending}>
              <Link to="/vto">
                <Map className="w-4 h-4 mr-2" />
                {step.status === 'completed' ? "View VTO" : "Map VTO to Scorecard"}
              </Link>
            </Button>
          </div>
        );

      case 'meeting-ready':
        return (
          <div className="space-y-3">
            {step.status === 'completed' ? (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {cutoverStatus.upcomingMeetingCount} upcoming meeting{cutoverStatus.upcomingMeetingCount !== 1 ? 's' : ''}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground">
                Schedule your first L10 weekly meeting.
              </p>
            )}
            <Button asChild variant={step.status === 'completed' ? "outline" : "default"} disabled={isPending}>
              <Link to="/meetings">
                <CalendarPlus className="w-4 h-4 mr-2" />
                {step.status === 'completed' ? "View Meetings" : "Create First Meeting"}
              </Link>
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        <p className="text-muted-foreground mt-2">Loading alignment status...</p>
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

  // Non-aligned orgs see a simple message
  if (!cutoverStatus.isAlignedMode) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Card>
          <CardContent className="py-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-brand mb-4" />
            <h2 className="text-xl font-semibold mb-2">Flexible Scorecard Mode</h2>
            <p className="text-muted-foreground mb-4">
              Your organization uses flexible scorecard mode. The cutover wizard is for aligned template organizations only.
            </p>
            <Button asChild variant="outline">
              <Link to="/scorecard">Go to Scorecard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Get Back on Track</h1>
        <p className="text-muted-foreground">
          Realign your scorecard so metrics, meetings, and Rocks stay in sync.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Alignment keeps your metrics, meetings, and Rocks on track using one consistent set of numbers.
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
        </CardContent>
      </Card>

      {/* Success Panel */}
      {cutoverStatus.allStepsComplete && (
        <Card className="border-success bg-success/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <PartyPopper className="w-12 h-12 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-success mb-1">Aligned and on track!</h2>
                <p className="text-muted-foreground">
                  All alignment steps complete. Click below to mark your scorecard as ready.
                </p>
              </div>
              <Button 
                onClick={handleMarkReady} 
                disabled={isMarkingReady || cutoverStatus.scorecardReady}
                className="gradient-brand"
              >
                {cutoverStatus.scorecardReady ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Already Ready
                  </>
                ) : isMarkingReady ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Mark as Ready
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Ready */}
      {cutoverStatus.scorecardReady && !cutoverStatus.allStepsComplete && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Scorecard was previously marked as ready. Review steps below if changes are needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={step.status === 'pending' ? 'opacity-60' : ''}
          >
            <CardContent className="py-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">
                  {renderStepIcon(step.status)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Step {index + 1}: {step.title}</h3>
                    {step.status === 'completed' && (
                      <Badge variant="outline" className="border-success text-success text-xs">
                        Complete
                      </Badge>
                    )}
                    {step.status === 'needs_attention' && (
                      <Badge variant="destructive" className="text-xs">
                        Needs Attention
                      </Badge>
                    )}
                    {step.status === 'pending' && (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Needs attention
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.status !== 'pending' && (
                    <>
                      <Separator className="my-3" />
                      {renderStepContent(step)}
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
              <Link to="/scorecard">
                <ArrowRight className="w-4 h-4 mr-2" />
                Scorecard Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/focus">
                <ArrowRight className="w-4 h-4 mr-2" />
                Manager Focus
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/scorecard/off-track">
                <ListChecks className="w-4 h-4 mr-2" />
                Off-Track View
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
