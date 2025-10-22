import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types/reports";
import { Skeleton } from "@/components/ui/skeleton";

const ReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as Report;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found</p>
        <Button onClick={() => navigate("/reports")} className="mt-4">
          Back to Reports
        </Button>
      </div>
    );
  }

  const summary = report.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{summary.period_label}</h1>
            <p className="text-muted-foreground">
              Generated {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.sent_at && (
            <Badge variant="success" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Sent {new Date(report.sent_at).toLocaleDateString()}
            </Badge>
          )}
          <Badge variant="brand">{report.period}</Badge>
          {report.file_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.executive_summary?.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-brand font-bold">•</span>
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* AI Commentary */}
      {summary.ai_commentary && (
        <Card className="bg-gradient-to-br from-brand/5 to-transparent border-brand/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-brand" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground italic">{summary.ai_commentary}</p>
          </CardContent>
        </Card>
      )}

      {/* Wins, Challenges, Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <TrendingUp className="w-5 h-5" />
              Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.wins?.map((win: string, idx: number) => (
                <li key={idx} className="text-sm text-foreground">
                  🚀 {win}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-warning/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.challenges?.map((challenge: string, idx: number) => (
                <li key={idx} className="text-sm text-foreground">
                  ⚠️ {challenge}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-brand/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand">
              <Lightbulb className="w-5 h-5" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.opportunities?.map((opp: string, idx: number) => (
                <li key={idx} className="text-sm text-foreground">
                  💡 {opp}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* KPI Summary */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.kpi_summary?.map((kpi: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div>
                  <p className="font-medium text-foreground">{kpi.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Target: {kpi.target}{kpi.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {kpi.current}{kpi.unit}
                  </p>
                  <Badge
                    variant={kpi.status === "success" ? "success" : "warning"}
                    className="text-xs"
                  >
                    {kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→"} {kpi.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rocks & Issues Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rocks Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Rocks</span>
                <span className="text-xl font-bold text-foreground">
                  {summary.rocks_summary?.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On Track</span>
                <Badge variant="success">{summary.rocks_summary?.on_track || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">At Risk</span>
                <Badge variant="warning">{summary.rocks_summary?.at_risk || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <Badge variant="muted">{summary.rocks_summary?.completed || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Issues</span>
                <span className="text-xl font-bold text-foreground">
                  {summary.issues_summary?.opened || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Solved</span>
                <Badge variant="success">{summary.issues_summary?.solved || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Still Open</span>
                <Badge variant="warning">{summary.issues_summary?.open || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportView;
