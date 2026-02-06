import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Cloud, 
  FileSpreadsheet, 
  Database, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import {
  useOrgDataSourceStatus,
  SOURCE_LABELS,
  type FlowStatus,
  type DataSourceType,
  type DataMode,
} from "@/hooks/useOrgDataSourceStatus";
import { format } from "date-fns";

/**
 * Get icon for data source type
 */
function getSourceIcon(source: DataSourceType) {
  switch (source) {
    case "jane_pipe":
    case "jane":
      return Cloud;
    case "legacy_workbook":
    case "csv":
    case "google_sheet":
      return FileSpreadsheet;
    case "manual":
      return Database;
    default:
      return HelpCircle;
  }
}

/**
 * Get icon and color for flow status
 */
function getFlowStatusConfig(status: FlowStatus): { 
  icon: typeof CheckCircle2; 
  colorClass: string;
  bgClass: string;
} {
  switch (status) {
    case "flowing":
      return { 
        icon: CheckCircle2, 
        colorClass: "text-success",
        bgClass: "bg-success/10 border-success/30",
      };
    case "connected_waiting":
      return { 
        icon: Clock, 
        colorClass: "text-warning",
        bgClass: "bg-warning/10 border-warning/30",
      };
    case "stale":
      return { 
        icon: Clock, 
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted/50 border-muted-foreground/30",
      };
    case "error":
      return { 
        icon: AlertCircle, 
        colorClass: "text-destructive",
        bgClass: "bg-destructive/10 border-destructive/30",
      };
    case "not_configured":
    default:
      return { 
        icon: HelpCircle, 
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted/30 border-border",
      };
  }
}

interface DataSourcePillProps {
  /** Compact mode - just icon + source name */
  compact?: boolean;
  /** Show loading state */
  showLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * DataSourcePill - Displays organization's data source status
 * 
 * Shows:
 * - Primary data source (Jane, Spreadsheet, etc.)
 * - Flow status (flowing, stale, error)
 * - Last updated time (in tooltip)
 */
export function DataSourcePill({ 
  compact = false, 
  showLoading = true,
  className 
}: DataSourcePillProps) {
  const status = useOrgDataSourceStatus();
  
  if (status.isLoading && showLoading) {
    return (
      <Badge variant="outline" className={cn("gap-1.5", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Loading...</span>
      </Badge>
    );
  }
  
  const SourceIcon = getSourceIcon(status.primarySource);
  const flowConfig = getFlowStatusConfig(status.flowStatus);
  const FlowIcon = flowConfig.icon;
  
  const sourceLabel = SOURCE_LABELS[status.primarySource] || "Unknown";
  const modeLabel = status.mode === "jane" ? "Jane Mode" : "Standard Mode";
  
  // Format coverage window
  const coverageText = status.coverageWindow.earliest && status.coverageWindow.latest
    ? `${format(new Date(status.coverageWindow.earliest), "MMM yyyy")} - ${format(new Date(status.coverageWindow.latest), "MMM yyyy")}`
    : "No data";
  
  // Secondary sources text
  const secondaryText = status.secondarySources.length > 0
    ? status.secondarySources.map(s => SOURCE_LABELS[s]).join(", ")
    : null;

  const pillContent = (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 cursor-default transition-colors",
        flowConfig.bgClass,
        className
      )}
    >
      <SourceIcon className={cn("w-3 h-3", flowConfig.colorClass)} />
      {compact ? (
        <span className="text-xs font-medium">{sourceLabel}</span>
      ) : (
        <>
          <span className="text-xs font-medium">{sourceLabel}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <FlowIcon className={cn("w-3 h-3", flowConfig.colorClass)} />
          {status.lastUpdatedRelative && (
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {status.lastUpdatedRelative}
            </span>
          )}
        </>
      )}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {pillContent}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start" 
          className="max-w-xs"
        >
          <div className="space-y-2 text-sm">
            {/* Mode */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-medium">{modeLabel}</span>
            </div>
            
            {/* Primary Source */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Primary:</span>
              <span className="font-medium">{sourceLabel}</span>
            </div>
            
            {/* Secondary Sources */}
            {secondaryText && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Secondary:</span>
                <span className="text-xs">{secondaryText}</span>
              </div>
            )}
            
            {/* Flow Status */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Status:</span>
              <span className={cn("font-medium", flowConfig.colorClass)}>
                {status.flowStatusLabel}
              </span>
            </div>
            
            {/* Coverage Window */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Coverage:</span>
              <span className="text-xs">{coverageText}</span>
            </div>
            
            {/* Last Updated */}
            {status.lastUpdatedAt && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Last update:</span>
                <span className="text-xs">
                  {format(status.lastUpdatedAt, "MMM d, yyyy")}
                </span>
              </div>
            )}
            
            {/* Jane Connection Status */}
            {status.mode === "jane" && status.janeConnectionStatus && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Connection:</span>
                <span className="capitalize text-xs">{status.janeConnectionStatus}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline data source status for headers
 */
export function DataSourceStatusLine({ className }: { className?: string }) {
  const status = useOrgDataSourceStatus();
  
  if (status.isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading data status...</span>
      </div>
    );
  }
  
  const modeLabel = status.mode === "jane" ? "Jane Mode" : "Standard Mode";
  const sourceLabel = SOURCE_LABELS[status.primarySource] || "Unknown";
  const flowConfig = getFlowStatusConfig(status.flowStatus);
  
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="text-muted-foreground">Mode:</span>
      <span className="font-medium">{modeLabel}</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-muted-foreground">Primary:</span>
      <span className="font-medium">{sourceLabel}</span>
      {status.lastUpdatedRelative && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className={cn("text-xs", flowConfig.colorClass)}>
            {status.lastUpdatedRelative}
          </span>
        </>
      )}
    </div>
  );
}
