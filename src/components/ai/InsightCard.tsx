import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Lightbulb, Info } from "lucide-react";
import { FeedbackButtons } from "./FeedbackButtons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InsightCardProps {
  type: "win" | "warning" | "opportunity";
  content: string;
  metadata?: {
    kpi_name?: string;
    delta?: number;
    week?: string;
  };
  logId?: string;
  className?: string;
}

export const InsightCard = ({ type, content, metadata, logId, className }: InsightCardProps) => {
  const getIcon = () => {
    switch (type) {
      case "win":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "opportunity":
        return <Lightbulb className="w-4 h-4 text-brand" />;
    }
  };

  const getEmoji = () => {
    switch (type) {
      case "win":
        return "🚀";
      case "warning":
        return "⚠️";
      case "opportunity":
        return "💡";
    }
  };

  const getBorderClass = () => {
    switch (type) {
      case "win":
        return "border-success/20 hover:border-success/40";
      case "warning":
        return "border-warning/20 hover:border-warning/40";
      case "opportunity":
        return "border-brand/20 hover:border-brand/40";
    }
  };

  const getBackgroundClass = () => {
    switch (type) {
      case "win":
        return "glass bg-gradient-to-br from-success/10 to-success/5 border-success/30";
      case "warning":
        return "glass bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30";
      case "opportunity":
        return "glass bg-gradient-to-br from-brand/10 to-accent/5 border-brand/30";
    }
  };

  const explainText = metadata?.kpi_name
    ? `Based on ${metadata.kpi_name}${metadata.delta ? ` (${metadata.delta > 0 ? '+' : ''}${metadata.delta}%)` : ''}`
    : "Generated from recent KPI trends and performance data";

  return (
    <Card className={cn(
      "transition-all duration-300 border-2 hover:shadow-lg animate-fade-in-up backdrop-blur-md",
      getBorderClass(),
      getBackgroundClass(),
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{getEmoji()}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {getIcon()}
                <Badge variant="muted" className="text-xs">AI-Generated</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-brand transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs glass">
                    <p className="text-xs">{explainText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-foreground italic leading-relaxed mb-3">
              {content}
            </p>
            {logId && <FeedbackButtons logId={logId} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
