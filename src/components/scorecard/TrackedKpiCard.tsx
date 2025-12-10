import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "lucide-react";

interface TrackedKpiCardProps {
  kpi: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    owner_id: string | null;
    users?: { full_name: string } | null;
    import_mappings?: any[];
  };
}

export function TrackedKpiCard({ kpi }: TrackedKpiCardProps) {
  const hasMappings = kpi.import_mappings && kpi.import_mappings.length > 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Production":
        return "brand";
      case "Financial":
        return "success";
      case "Referral":
        return "muted";
      case "Operational":
        return "warning";
      case "Quality":
        return "muted";
      default:
        return "muted";
    }
  };

  return (
    <Card className="glass hover:scale-105 transition-all duration-300 hover:shadow-glow group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1 gradient-brand bg-clip-text text-transparent">
              {kpi.name}
            </h3>
            <Badge variant={getCategoryColor(kpi.category)} className="text-xs">
              {kpi.category}
            </Badge>
          </div>
          {hasMappings && (
            <div className="flex items-center gap-1 text-success text-xs">
              <Link className="h-3 w-3" />
              <span>Mapped</span>
            </div>
          )}
        </div>

        {kpi.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
            {kpi.description}
          </p>
        )}

        {/* Empty sparkline placeholder with shimmer */}
        <div className="h-16 bg-surface/30 rounded-lg mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="text-xs">
              {kpi.users?.full_name || "Unassigned"}
            </Badge>
          </div>
          <Badge variant="muted" className="text-xs font-normal">
            Awaiting data
          </Badge>
        </div>
      </div>
    </Card>
  );
}
