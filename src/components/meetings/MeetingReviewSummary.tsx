import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";

interface MeetingReviewSummaryProps {
  meeting: {
    started_at: string | null;
    ended_at: string | null;
    scheduled_for: string;
    level10_score?: number | null;
    outcome_headline?: string | null;
    outcome_notes?: string | null;
  };
  discussedCount: number;
  totalItems: number;
  issues: Array<{
    id: string;
    title: string;
    status: string;
  }>;
}

export function MeetingReviewSummary({
  meeting,
  discussedCount,
  totalItems,
  issues,
}: MeetingReviewSummaryProps) {
  const navigate = useNavigate();

  const duration = meeting.started_at && meeting.ended_at
    ? differenceInMinutes(new Date(meeting.ended_at), new Date(meeting.started_at))
    : null;

  return (
    <Card className="border-gray-500/30 bg-gray-500/5">
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Meeting Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {/* Time Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Started</p>
            <p className="font-medium">
              {meeting.started_at
                ? format(new Date(meeting.started_at), "h:mm a")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Ended</p>
            <p className="font-medium">
              {meeting.ended_at
                ? format(new Date(meeting.ended_at), "h:mm a")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration !== null ? `${duration} min` : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Discussed</p>
            <p className="font-medium">
              {discussedCount}/{totalItems} items
            </p>
          </div>
          {meeting.level10_score && (
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="font-medium">
                {meeting.level10_score}/10
              </p>
            </div>
          )}
        </div>

        {/* Headline & Notes */}
        {(meeting.outcome_headline || meeting.outcome_notes) && (
          <div className="pt-2 border-t space-y-2">
            {meeting.outcome_headline && (
              <p className="text-sm font-medium">{meeting.outcome_headline}</p>
            )}
            {meeting.outcome_notes && (
              <p className="text-sm text-muted-foreground">{meeting.outcome_notes}</p>
            )}
          </div>
        )}

        {/* Issues Created */}
        {issues.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Issues Created ({issues.length})
            </p>
            <div className="space-y-1">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-2 rounded bg-card hover:bg-accent/50 cursor-pointer transition-colors text-sm"
                  onClick={() => navigate(`/issues?highlight=${issue.id}`)}
                >
                  <span className="truncate flex-1">{issue.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {issue.status}
                    </Badge>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
