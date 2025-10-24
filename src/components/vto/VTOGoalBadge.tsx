import { Badge } from "@/components/ui/badge";
import { Target, ExternalLink } from "lucide-react";
import { useVTOLinks, getGoalDescription } from "@/hooks/useVTOLinks";
import { useNavigate } from "react-router-dom";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface VTOGoalBadgeProps {
  linkType: 'kpi' | 'rock' | 'issue' | 'doc';
  linkId: string;
}

export const VTOGoalBadge = ({ linkType, linkId }: VTOGoalBadgeProps) => {
  const { data: links, isLoading } = useVTOLinks(linkType, linkId);
  const navigate = useNavigate();

  if (isLoading || !links || links.length === 0) {
    return null;
  }

  const link = links[0]; // Show first link
  const goalDesc = getGoalDescription(link.goal_key, link.vto_version);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge 
          variant="secondary" 
          className="gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/vto');
          }}
        >
          <Target className="w-3 h-3" />
          V/TO Goal
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Linked to V/TO Goal</h4>
            <ExternalLink 
              className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary"
              onClick={() => navigate('/vto')}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {goalDesc}
          </p>
          {links.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{links.length - 1} more goal{links.length > 2 ? 's' : ''}
            </p>
          )}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              This {linkType} contributes to strategic goals. Progress automatically updates V/TO traction score.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
