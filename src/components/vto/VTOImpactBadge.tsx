import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";

interface VTOImpactBadgeProps {
  impactedSections: string[];
  scorecardImpact?: { metric_count?: number };
  rocksImpact?: { rock_count?: number };
  compact?: boolean;
}

const sectionLabels: Record<string, string> = {
  core_values: 'Core Values',
  core_focus: 'Core Focus',
  ten_year_target: '10-Year Target',
  three_year_picture: '3-Year Picture',
  one_year_plan: '1-Year Plan',
  marketing_strategy: 'Marketing Strategy',
  quarterly_rocks: 'Quarterly Rocks',
};

export function VTOImpactBadge({
  impactedSections,
  scorecardImpact,
  rocksImpact,
  compact = false,
}: VTOImpactBadgeProps) {
  const sectionCount = impactedSections?.length || 0;
  const metricCount = scorecardImpact?.metric_count || 0;
  const rockCount = rocksImpact?.rock_count || 0;

  const getImpactLevel = () => {
    if (sectionCount >= 5) return 'high';
    if (sectionCount >= 3) return 'medium';
    return 'low';
  };

  const impactLevel = getImpactLevel();
  const impactColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  };

  const ImpactIcon = impactLevel === 'high' ? AlertTriangle : impactLevel === 'medium' ? Info : CheckCircle;

  if (compact) {
    return (
      <Badge variant="outline" className={`${impactColors[impactLevel]} gap-1`}>
        <ImpactIcon className="h-3 w-3" />
        {sectionCount} sections
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className={`${impactColors[impactLevel]} gap-1`}>
        <ImpactIcon className="h-3 w-3" />
        {impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)} Impact
      </Badge>
      
      {sectionCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          {sectionCount} sections changed
        </Badge>
      )}
      
      {metricCount > 0 && (
        <Badge variant="outline" className="text-muted-foreground">
          {metricCount} metrics
        </Badge>
      )}
      
      {rockCount > 0 && (
        <Badge variant="outline" className="text-muted-foreground">
          {rockCount} rocks
        </Badge>
      )}
    </div>
  );
}

export function VTOImpactSectionList({ sections }: { sections: string[] }) {
  if (!sections?.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {sections.map((section) => (
        <Badge key={section} variant="outline" className="text-xs">
          {sectionLabels[section] || section}
        </Badge>
      ))}
    </div>
  );
}
