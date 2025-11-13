import { ClarityShell } from "@/components/clarity/ClarityShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function QuarterlyReview() {
  const { data: user } = useCurrentUser();

  return (
    <ClarityShell
      organizationId={user?.team_id || ''}
      autosaveStatus="saved"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quarterly Review</h1>
          <p className="text-muted-foreground">
            Review progress and plan your next quarter
          </p>
        </div>

        {/* Four Review Tiles */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Review Last Quarter
              </CardTitle>
              <CardDescription>
                Complete, carry forward, or archive priorities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review what you accomplished and what needs to continue.
              </p>
              <Button variant="outline" className="w-full">
                Start Review
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                KPI Trends & Risks
              </CardTitle>
              <CardDescription>
                Analyze metrics and identify concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                See which metrics are trending and where to focus.
              </p>
              <Button variant="outline" className="w-full">
                View Trends
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues Surfaced
              </CardTitle>
              <CardDescription>
                From metrics, notes, and meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Convert key issues into priorities for next quarter.
              </p>
              <Button variant="outline" className="w-full">
                Review Issues
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Plan Next Quarter
              </CardTitle>
              <CardDescription>
                Set priorities with capacity check
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Choose 3-7 priorities and assign owners.
              </p>
              <Button variant="outline" className="w-full">
                Plan Quarter
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Apply Button */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Ready to apply?</h3>
                <p className="text-sm text-muted-foreground">
                  This will create a new revision and seed your next quarter
                </p>
              </div>
              <Button>
                Apply & Create Revision
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClarityShell>
  );
}
