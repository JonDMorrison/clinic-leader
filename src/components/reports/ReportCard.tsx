import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Mail, Calendar } from "lucide-react";
import { Report } from "@/types/reports";
import { Link } from "react-router-dom";

interface ReportCardProps {
  report: Report;
}

export const ReportCard = ({ report }: ReportCardProps) => {
  const summary = report.summary;
  const periodLabel = summary.period_label || report.period;

  const getPeriodBadge = () => {
    return report.period === "weekly" 
      ? <Badge variant="brand">Weekly</Badge>
      : <Badge variant="muted">Monthly</Badge>;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-brand" />
              <CardTitle className="text-lg">{periodLabel}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{new Date(report.created_at).toLocaleDateString()}</span>
              {getPeriodBadge()}
            </div>
          </div>
          {report.sent_at && (
            <Badge variant="success" className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Sent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Executive Summary</h4>
          <ul className="space-y-1">
            {summary.executive_summary?.slice(0, 3).map((item: string, idx: number) => (
              <li key={idx} className="text-xs text-muted-foreground">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {summary.wins?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {summary.challenges?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Challenges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">
              {summary.opportunities?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Opportunities</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/reports/${report.id}`}>
              <FileText className="w-4 h-4 mr-2" />
              View Report
            </Link>
          </Button>
          {report.file_url && (
            <Button asChild variant="outline" size="sm">
              <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
