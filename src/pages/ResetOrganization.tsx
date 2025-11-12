import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ResetOrganization() {
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [deleteOrg, setDeleteOrg] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const selectedOrg = organizations?.find(org => org.id === selectedOrgId);

  const handleResetClick = () => {
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmReset = async () => {
    setShowConfirmDialog(false);
    setIsResetting(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-organization", {
        body: {
          organization_id: selectedOrgId,
          delete_org: deleteOrg,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message, {
          description: `Deleted records: ${Object.entries(data.summary)
            .map(([table, count]) => `${table}: ${count}`)
            .join(", ")}`,
          duration: 10000,
        });
        
        // Reset form and refresh organization list
        setSelectedOrgId("");
        setDeleteOrg(false);
        queryClient.invalidateQueries({ queryKey: ["organizations-admin"] });
      } else {
        throw new Error(data.error || "Reset failed");
      }
    } catch (error: any) {
      console.error("Error resetting organization:", error);
      toast.error("Failed to reset organization", {
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Reset Organization
        </h1>
        <p className="text-muted-foreground">
          Permanently delete all data for an organization. Use with extreme caution.
        </p>
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This action will permanently delete all data associated with the selected organization.
            This includes users, documents, metrics, meetings, and all related records.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization">Select Organization</Label>
            <Select
              value={selectedOrgId}
              onValueChange={setSelectedOrgId}
              disabled={isLoading || isResetting}
            >
              <SelectTrigger id="organization">
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-org"
              checked={deleteOrg}
              onCheckedChange={(checked) => setDeleteOrg(checked as boolean)}
              disabled={isResetting}
            />
            <Label
              htmlFor="delete-org"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also delete the organization record itself (not just its data)
            </Label>
          </div>

          {selectedOrg && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">You are about to reset:</p>
              <p className="text-lg font-bold text-foreground">{selectedOrg.name}</p>
              <p className="text-sm text-muted-foreground">
                {deleteOrg
                  ? "The organization and all its data will be permanently deleted."
                  : "All data will be deleted but the organization record will be preserved."}
              </p>
            </div>
          )}

          <Button
            variant="destructive"
            onClick={handleResetClick}
            disabled={!selectedOrgId || isResetting}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isResetting ? "Resetting..." : "Reset Organization"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all data for{" "}
                <span className="font-bold text-foreground">{selectedOrg?.name}</span>.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone.
              </p>
              <p>
                All users, documents, metrics, meetings, rocks, issues, and related
                records will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Yes, Reset Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
