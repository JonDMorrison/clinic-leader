import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Archive, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentQuarter } from "@/lib/rocks/templates";

interface Rock {
  id: string;
  title: string;
  owner_id?: string;
  status: string;
  users?: { full_name: string };
}

interface ArchiveRocksDialogProps {
  open: boolean;
  onClose: () => void;
  incompleteRocks: Rock[];
  onSuccess: () => void;
}

type ActionType = 'archive' | 'roll-forward' | 'convert-issue';

export function ArchiveRocksDialog({
  open,
  onClose,
  incompleteRocks,
  onSuccess,
}: ArchiveRocksDialogProps) {
  const [actions, setActions] = useState<Record<string, ActionType>>({});
  const [loading, setLoading] = useState(false);
  const nextQuarter = getCurrentQuarter();

  const handleActionChange = (rockId: string, action: ActionType) => {
    setActions(prev => ({ ...prev, [rockId]: action }));
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const updates = [];

      for (const rock of incompleteRocks) {
        const action = actions[rock.id] || 'archive';

        if (action === 'archive') {
          // Mark as archived (we can add an archived field or just set status to done with note)
          updates.push(
            supabase
              .from('rocks')
              .update({ status: 'done', note: 'Archived from previous quarter' })
              .eq('id', rock.id)
          );
        } else if (action === 'roll-forward') {
          // Update quarter to next quarter
          updates.push(
            supabase
              .from('rocks')
              .update({ quarter: nextQuarter })
              .eq('id', rock.id)
          );
        } else if (action === 'convert-issue') {
          // Create issue and mark rock as done
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('team_id')
              .eq('email', userData.user.email)
              .single();

            if (userProfile) {
              await supabase.from('issues').insert({
                title: `[From Rock] ${rock.title}`,
                status: 'open',
                priority: 2,
                owner_id: rock.owner_id,
                organization_id: userProfile.team_id,
                context: `Converted from incomplete rock: ${rock.title}`,
              });

              updates.push(
                supabase
                  .from('rocks')
                  .update({ status: 'done', note: 'Converted to issue' })
                  .eq('id', rock.id)
              );
            }
          }
        }
      }

      await Promise.all(updates);

      const archiveCount = Object.values(actions).filter(a => a === 'archive').length || incompleteRocks.length;
      const rollCount = Object.values(actions).filter(a => a === 'roll-forward').length;
      const issueCount = Object.values(actions).filter(a => a === 'convert-issue').length;

      toast.success(
        `Processed ${incompleteRocks.length} rocks: ${archiveCount} archived, ${rollCount} rolled forward, ${issueCount} converted to issues`
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing rocks:', error);
      toast.error('Failed to process rocks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Handle Incomplete Rocks
          </DialogTitle>
          <DialogDescription>
            Choose what to do with rocks that weren't completed last quarter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {incompleteRocks.map((rock) => (
            <div key={rock.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rock.title}</h4>
                  {rock.users && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Owner: {rock.users.full_name}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {rock.status}
                </Badge>
              </div>

              <RadioGroup
                value={actions[rock.id] || 'archive'}
                onValueChange={(value) => handleActionChange(rock.id, value as ActionType)}
                className="space-y-2"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="archive" id={`${rock.id}-archive`} className="mt-0.5" />
                  <Label htmlFor={`${rock.id}-archive`} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Archive</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mark as complete and move to history
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="roll-forward" id={`${rock.id}-roll`} className="mt-0.5" />
                  <Label htmlFor={`${rock.id}-roll`} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Roll to {nextQuarter}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Continue working on this next quarter
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="convert-issue" id={`${rock.id}-issue`} className="mt-0.5" />
                  <Label htmlFor={`${rock.id}-issue`} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Convert to Issue</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Discuss in next L10 meeting
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={loading}>
              {loading ? 'Processing...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
