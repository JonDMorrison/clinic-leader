import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, DollarSign, Star, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AISettings = () => {
  const { data: usageStats } = useQuery({
    queryKey: ["ai-usage-stats"],
    queryFn: async () => {
      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usage, error: usageError } = await supabase
        .from("ai_usage")
        .select("*")
        .gte("date", startOfMonth.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (usageError) throw usageError;

      // Calculate totals
      const totalTokens = usage?.reduce((sum, day) => sum + day.tokens_used, 0) || 0;
      const totalCalls = usage?.reduce((sum, day) => sum + day.api_calls, 0) || 0;
      const totalCost = usage?.reduce((sum, day) => sum + parseFloat(String(day.cost_estimate)), 0) || 0;

      return {
        totalTokens,
        totalCalls,
        totalCost,
        dailyUsage: usage || [],
      };
    },
  });

  const { data: feedbackStats } = useQuery({
    queryKey: ["ai-feedback-stats"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("ai_logs")
        .select("feedback")
        .not("feedback->score", "is", null);

      if (error) throw error;

      const feedbackScores = logs
        ?.map((log: any) => log.feedback?.score)
        .filter((score: number | null) => score !== null) || [];

      const avgScore = feedbackScores.length > 0
        ? feedbackScores.reduce((sum: number, score: number) => sum + score, 0) / feedbackScores.length
        : 0;

      const positive = feedbackScores.filter((s: number) => s > 0).length;
      const negative = feedbackScores.filter((s: number) => s < 0).length;

      return {
        avgScore,
        totalFeedback: feedbackScores.length,
        positive,
        negative,
      };
    },
  });

  const { data: issueStats } = useQuery({
    queryKey: ["ai-issue-stats"],
    queryFn: async () => {
      const { data: aiIssues, error } = await supabase
        .from("issues")
        .select("status")
        .ilike("title", "[AI]%");

      if (error) throw error;

      const total = aiIssues?.length || 0;
      const solved = aiIssues?.filter((i) => i.status === "solved").length || 0;
      const open = aiIssues?.filter((i) => i.status === "open").length || 0;

      return { total, solved, open, acceptanceRate: total > 0 ? (solved / total) * 100 : 0 };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-bold text-foreground">AI Usage & Performance</h1>
        </div>
        <p className="text-muted-foreground">Monitor AI consumption, costs, and user feedback</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Calls (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand" />
              <span className="text-3xl font-semibold text-foreground">
                {usageStats?.totalCalls || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="text-3xl font-semibold text-foreground">
                {(usageStats?.totalTokens || 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-warning" />
              <span className="text-3xl font-semibold text-foreground">
                ${(usageStats?.totalCost || 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-brand" />
              <span className="text-3xl font-semibold text-foreground">
                {feedbackStats?.avgScore ? (feedbackStats.avgScore > 0 ? "👍" : "👎") : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Feedback</span>
                <Badge variant="muted">{feedbackStats?.totalFeedback || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Positive</span>
                <Badge variant="success">{feedbackStats?.positive || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Negative</span>
                <Badge variant="danger">{feedbackStats?.negative || 0}</Badge>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Satisfaction Rate</span>
                  <span className="text-lg font-semibold text-brand">
                    {feedbackStats?.totalFeedback
                      ? Math.round((feedbackStats.positive / feedbackStats.totalFeedback) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Created</span>
                <Badge variant="muted">{issueStats?.total || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Solved</span>
                <Badge variant="success">{issueStats?.solved || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open</span>
                <Badge variant="warning">{issueStats?.open || 0}</Badge>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Acceptance Rate</span>
                  <span className="text-lg font-semibold text-brand">
                    {issueStats?.acceptanceRate ? issueStats.acceptanceRate.toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-foreground">
              <span className="font-medium">Caching:</span> AI insights are cached per week to prevent duplicate API calls.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-foreground">
              <span className="font-medium">Rate Limiting:</span> API calls are throttled to prevent over-consumption during scheduled jobs.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-sm text-foreground">
              <span className="font-medium">Model:</span> Using google/gemini-2.5-flash for optimal cost/performance balance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISettings;
