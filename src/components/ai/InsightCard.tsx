import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Lightbulb, Info, ChevronDown } from "lucide-react";
import { FeedbackButtons } from "./FeedbackButtons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
  style?: React.CSSProperties;
}

export const InsightCard = ({ type, content, metadata, logId, className, style }: InsightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = content.length > 120;
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
        return "glass bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30";
      case "warning":
        return "glass bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/30";
      case "opportunity":
        return "glass bg-gradient-to-br from-brand/10 via-accent/5 to-transparent border-brand/30";
    }
  };

  const getIconGradient = () => {
    switch (type) {
      case "win":
        return "from-success/20 to-success/5";
      case "warning":
        return "from-warning/20 to-warning/5";
      case "opportunity":
        return "from-brand/20 to-accent/5";
    }
  };

  const explainText = metadata?.kpi_name
    ? `Based on ${metadata.kpi_name}${metadata.delta ? ` (${metadata.delta > 0 ? '+' : ''}${metadata.delta}%)` : ''}`
    : "Generated from recent KPI trends and performance data";

  const displayContent = isLongContent && !isExpanded 
    ? content.slice(0, 120) + "..." 
    : content;

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -15, scale: 0.95 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={style}
      className={cn("h-full", className)}
    >
      <Card className={cn(
        "transition-all duration-300 border-2 hover:shadow-xl backdrop-blur-md relative overflow-hidden h-full group",
        getBorderClass(),
        getBackgroundClass(),
        "hover:scale-[1.02]"
      )}>
        {/* Icon background gradient */}
        <div className={cn(
          "absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-50",
          "bg-gradient-radial",
          getIconGradient()
        )} />
        
        <CardContent className="p-5 relative z-10">
          <div className="flex items-start gap-4">
            {/* Animated emoji with gradient background */}
            <motion.div 
              className={cn(
                "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                "bg-gradient-to-br shadow-md",
                getIconGradient()
              )}
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
            >
              {getEmoji()}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-3">
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
              
              <div>
                <p className="text-sm text-foreground leading-relaxed mb-3">
                  {displayContent}
                </p>
                
                {isLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-brand hover:text-brand/80 transition-colors flex items-center gap-1 mb-3"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </motion.div>
                  </button>
                )}
              </div>
              
              {logId && <FeedbackButtons logId={logId} />}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
