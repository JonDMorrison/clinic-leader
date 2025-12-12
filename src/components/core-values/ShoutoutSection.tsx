import { useState } from "react";
import { useCoreValueShoutouts } from "@/hooks/useCoreValues";
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-5 w-5 text-primary" />
                Core Values Shout-Out
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Quick recognition. Keep notes free of patient details.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Shout-Out
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          ) : shoutouts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No shout-outs yet this meeting.</p>
              <p className="text-xs">Recognize a teammate for living our values!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {shoutouts.map((shoutout) => {
                  const canDelete =
                    shoutout.created_by === user?.id || isAdmin;

                  return (
                    <div
                      key={shoutout.id}
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {shoutout.recognized_user?.full_name || "Team Member"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
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
                        <p className="text-sm text-muted-foreground">
                          "{shoutout.note}"
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        by {shoutout.created_by_user?.full_name || "Someone"} •{" "}
                        {formatDistanceToNow(new Date(shoutout.created_at), { addSuffix: true })}
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
