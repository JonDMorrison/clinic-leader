import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  Clock, 
  EyeOff, 
  Eye,
  Plus,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";

export interface JaneResource {
  icon: typeof FileText;
  label: string;
  description: string;
  available: boolean;
  metrics?: string[];
}

export interface ResourceStatus {
  resource: string;
  lastSync: string | null;
  rowCount: number;
  status: 'healthy' | 'stale' | 'waiting' | 'error';
  lastError: string | null;
}

interface ResourceCardProps {
  resourceKey: string;
  resource: JaneResource;
  isActive: boolean;
  isHidden: boolean;
  status?: ResourceStatus;
  onHide: (resourceKey: string) => void;
  onUnhide: (resourceKey: string) => void;
  onAddMetric: (resourceKey: string, metricName: string) => void;
}

export function ResourceCard({
  resourceKey,
  resource,
  isActive,
  isHidden,
  status,
  onHide,
  onUnhide,
  onAddMetric,
}: ResourceCardProps) {
  const Icon = resource.icon;
  const isComingSoon = !resource.available;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative p-4 rounded-lg border transition-all ${
        isHidden
          ? 'bg-muted/20 border-dashed opacity-70'
          : isComingSoon
          ? 'bg-muted/20 border-dashed opacity-60'
          : resource.available
          ? isActive && status?.status === 'healthy'
            ? 'bg-success/5 border-success/20 hover:border-success/40'
            : isActive
            ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
            : 'bg-muted/30 border-border hover:border-primary/30'
          : 'bg-muted/20 border-dashed opacity-60'
      }`}
    >
      {/* Action buttons - show on hover for available resources */}
      {resource.available && !isComingSoon && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    isHidden ? onUnhide(resourceKey) : onHide(resourceKey);
                  }}
                >
                  {isHidden ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isHidden ? "Show this resource" : "Hide this resource"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${
            isHidden
              ? 'bg-muted/50'
              : resource.available
              ? isActive ? 'bg-primary/10' : 'bg-muted'
              : 'bg-muted/50'
          }`}>
            <Icon className={`w-4 h-4 ${
              isHidden
                ? 'text-muted-foreground/50'
                : resource.available
                ? isActive ? 'text-primary' : 'text-muted-foreground'
                : 'text-muted-foreground/50'
            }`} />
          </div>
          <span className="font-medium text-sm">{resource.label}</span>
        </div>
        
        {isHidden ? (
          <Badge variant="outline" className="text-xs opacity-60">
            Hidden
          </Badge>
        ) : resource.available ? (
          isActive && status?.status === 'healthy' ? (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Active
            </Badge>
          ) : isActive ? (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Available
            </Badge>
          )
        ) : (
          <Badge variant="outline" className="text-xs opacity-60">
            Coming Soon
          </Badge>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        {resource.description}
      </p>
      
      {resource.metrics && resource.metrics.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Metrics:</p>
          <div className="flex flex-wrap gap-1">
            {resource.metrics.map((metric) => (
              <TooltipProvider key={metric} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onAddMetric(resourceKey, metric)}
                      disabled={isComingSoon || isHidden}
                      className={`group/metric flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded transition-all ${
                        isComingSoon || isHidden
                          ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                          : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer'
                      }`}
                    >
                      {metric}
                      {!isComingSoon && !isHidden && (
                        <Plus className="w-3 h-3 opacity-0 group-hover/metric:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isComingSoon 
                      ? "Coming soon" 
                      : isHidden 
                      ? "Unhide to add metrics"
                      : "Add to Scorecard"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
