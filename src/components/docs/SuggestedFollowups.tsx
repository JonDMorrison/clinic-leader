import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface SuggestedFollowupsProps {
  followups: string[];
  onSelect: (question: string) => void;
}

export const SuggestedFollowups = ({ followups, onSelect }: SuggestedFollowupsProps) => {
  if (!followups || followups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {followups.map((followup, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(followup)}
          className="text-xs h-7 gap-1 hover:bg-primary/10"
        >
          <MessageCircle className="h-3 w-3" />
          {followup.length > 50 ? `${followup.slice(0, 50)}...` : followup}
        </Button>
      ))}
    </div>
  );
};
