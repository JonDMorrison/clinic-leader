import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow, format } from "date-fns";
import { Database, RefreshCw, Clock, Calendar, ExternalLink } from "lucide-react";

interface SourceBadgeProps {
  source: string | null;
  syncSource: string;
  cadence: string;
  lastUpdated: string | null;
  janeLastSync?: string | null;
  /** Compact mode renders a smaller, inline text style instead of badges */
  compact?: boolean;
}

const getSourceLabel = (source: string | null, syncSource: string): string => {
  if (source) {
    // Normalize source names for display
    const sourceMap: Record<string, string> = {
      manual: "Manual",
      google_sheet: "Google Sheet",
      jane: "Jane",
      jane_pipe: "Jane Data Pipe",
      csv: "CSV Import",
      import: "Import",
    };
    return sourceMap[source.toLowerCase()] || source;
  }
  // Fall back to sync_source config
  const syncMap: Record<string, string> = {
    manual: "Manual",
    google_sheet: "Google Sheet",
    jane: "Jane",
  };
  return syncMap[syncSource] || syncSource;
};

// Check if source is from Jane Data Pipe
export const isJanePipeSource = (source: string | null): boolean => {
  return source?.toLowerCase() === "jane_pipe";
};

const getSourceVariant = (source: string | null, syncSource: string): "default" | "secondary" | "outline" => {
  const effectiveSource = source?.toLowerCase() || syncSource;
  if (effectiveSource === "jane" || effectiveSource === "jane_pipe") return "default";
  if (effectiveSource === "google_sheet") return "secondary";
  return "outline";
};

export function SourceBadge({
  source,
  syncSource,
  cadence,
  lastUpdated,
  janeLastSync,
  compact = false,
}: SourceBadgeProps) {
  const navigate = useNavigate();
  const isAutoSync = syncSource !== "manual";
  const sourceLabel = getSourceLabel(source, syncSource);
  const variant = getSourceVariant(source, syncSource);
  const isJanePipe = isJanePipeSource(source);

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "—";
    try {
      return formatDistanceToNow(new Date(ts), { addSuffix: true });
    } catch {
      return "—";
    }
  };

  const formatFullTimestamp = (ts: string | null) => {
    if (!ts) return "—";
    try {
      return format(new Date(ts), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "—";
    }
  };

  const handleViewImportDetails = () => {
    navigate("/settings/integrations/jane");
  };

  // Compact mode: simple inline text
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-help text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors">
              <RefreshCw className="h-3 w-3" />
              <span>{sourceLabel}</span>
              {isAutoSync && (
                <span className="text-primary/70">• Auto</span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            align="start"
            className="w-72 p-3 bg-popover/95 backdrop-blur-sm border shadow-lg"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Source:</span>
                <span className="font-medium text-foreground">{sourceLabel}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cadence:</span>
                <span className="font-medium text-foreground capitalize">{cadence}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sync Mode:</span>
                <span className="font-medium text-foreground">
                  {isAutoSync ? "Automatic" : "Manual"}
                </span>
              </div>
              
              <div className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium text-foreground">
                    {lastUpdated ? formatFullTimestamp(lastUpdated) : "No data yet"}
                  </span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <Badge variant={variant} className="text-xs font-medium">
              {sourceLabel}
            </Badge>
            {isAutoSync && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                <RefreshCw className="h-3 w-3 mr-1" />
                Auto
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="end"
          className="w-72 p-3 bg-popover/95 backdrop-blur-sm border shadow-lg"
        >
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-foreground">{sourceLabel}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cadence:</span>
              <span className="font-medium text-foreground capitalize">{cadence}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sync Mode:</span>
              <span className="font-medium text-foreground">
                {isAutoSync ? "Automatic" : "Manual"}
              </span>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-col">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium text-foreground">
                  {lastUpdated ? formatFullTimestamp(lastUpdated) : "No data yet"}
                </span>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    ({formatTimestamp(lastUpdated)})
                  </span>
                )}
              </div>
            </div>
            
            {/* Jane Data Pipe specific info */}
            {isJanePipe && lastUpdated && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Derived from Jane bulk analytics delivery on {format(new Date(lastUpdated), "MMM d, yyyy")}
                </p>
                <button
                  onClick={handleViewImportDetails}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View import details
                </button>
              </div>
            )}
            
            {syncSource === "jane" && janeLastSync && !isJanePipe && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-start gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Last Jane Sync:</span>
                    <span className="font-medium text-foreground">
                      {formatFullTimestamp(janeLastSync)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LastUpdatedText({ lastUpdated }: { lastUpdated: string | null }) {
  if (!lastUpdated) return null;
  
  try {
    const relativeTime = formatDistanceToNow(new Date(lastUpdated), { addSuffix: true });
    return (
      <span className="text-xs text-muted-foreground">
        Updated {relativeTime}
      </span>
    );
  } catch {
    return null;
  }
}
