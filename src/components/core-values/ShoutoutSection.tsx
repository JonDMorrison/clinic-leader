import { useState } from "react";
import { useCoreValueShoutouts } from "@/hooks/useCoreValueShoutouts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Plus, Trash2, AlertCircle } from "lucide-react";
import { ShoutoutDialog } from "./ShoutoutDialog";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShoutoutSectionProps {
  meetingId?: string;
}

export function ShoutoutSection({ meetingId }: ShoutoutSectionProps) {
  const { shoutouts, isLoading, deleteShoutout } = useCoreValueShoutouts(meetingId);
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "owner" || user?.role === "director";
  
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteShoutout.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-primary" />
                Core Values Shout-Out
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Quick recognition. Keep notes free of patient details.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-14 bg-muted/30 rounded animate-pulse" />
              <div className="h-14 bg-muted/30 rounded animate-pulse" />
            </div>
          ) : shoutouts.length === 0 ? (
            <div className="text-center py-5 text-muted-foreground">
              <Heart className="h-6 w-6 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No shout-outs yet.</p>
              <p className="text-xs">Recognize a teammate for living our values!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-2">
                {shoutouts.map((shoutout) => {
                  const canDelete = shoutout.created_by === user?.id || isAdmin;

                  return (
                    <div
                      key={shoutout.id}
                      className="p-3 bg-muted/30 rounded-lg space-y-1.5 border border-border/30 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {shoutout.recognized_user?.full_name || "Team Member"}
                          </span>
                          <Badge variant="secondary" className="text-xs py-0">
                            {shoutout.core_value?.title?.split(" ").slice(0, 2).join(" ") || "Value"}
                          </Badge>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-50 hover:opacity-100"
                            onClick={() => setDeleteId(shoutout.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      
                      {shoutout.note && (
                        <p className="text-xs text-muted-foreground italic">
                          "{shoutout.note}"
                        </p>
                      )}
                      
                      <p className="text-[10px] text-muted-foreground/70">
                        by {shoutout.created_by_user?.full_name || "Someone"} • {formatDistanceToNow(new Date(shoutout.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ShoutoutDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        meetingId={meetingId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shout-Out?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the recognition. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
