import { ClarityShell } from "@/components/clarity/ClarityShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function TractionEngine() {
  const { data: user } = useCurrentUser();

  return (
    <ClarityShell
      organizationId={user?.team_id || ''}
      autosaveStatus="saved"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traction Engine</h1>
          <p className="text-muted-foreground">
            Set goals, create priorities, and track execution
          </p>
        </div>

        {/* Three Boards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* 1-Year Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                1-Year Plan
              </CardTitle>
              <CardDescription>Annual targets and goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Targets</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium">$1.5M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit %</span>
                      <span className="font-medium">15%</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  Add Goal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quarterly Priorities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Quarterly Priorities
              </CardTitle>
              <CardDescription>Focus for this quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium">Launch new service line</p>
                    <Badge variant="secondary" className="text-xs">on_track</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Owner: Sarah</p>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  Add Priority
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Issues
              </CardTitle>
              <CardDescription>Problems to solve</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Scheduling bottleneck</p>
                  <Badge variant="outline" className="text-xs">open</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  Add Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity feed will appear here once you start creating goals and priorities.
            </p>
          </CardContent>
        </Card>
      </div>
    </ClarityShell>
  );
}
