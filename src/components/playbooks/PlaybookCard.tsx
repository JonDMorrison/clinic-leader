import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Playbook } from "@/types/playbook";

interface PlaybookCardProps {
  playbook: Playbook;
  onView: (id: string) => void;
  onDownload: (playbook: Playbook) => void;
}

export const PlaybookCard = ({ playbook, onView, onDownload }: PlaybookCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-brand to-accent rounded-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2 mb-1">
              {playbook.title}
            </h3>
            {playbook.category && (
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-brand/10 text-brand mb-2">
                {playbook.category}
              </span>
            )}
            {playbook.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {playbook.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(playbook.updated_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => onView(playbook.id)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDownload(playbook)}
        >
          <Download className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
