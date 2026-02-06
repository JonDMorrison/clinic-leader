/**
 * InterventionTypeRegistryPanel
 * 
 * Admin UI for managing intervention type registry.
 * Types are DEPRECATED, never deleted, to preserve referential integrity.
 * 
 * GOVERNANCE: intervention_type_registry is the single source of truth.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Tag, 
  Plus, 
  Archive,
  RotateCcw,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RegistryType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  created_at: string;
}

const CATEGORIES = [
  "Operations",
  "Marketing & Growth", 
  "Staffing & HR",
  "Financial",
  "Clinical",
  "Technology",
  "Other",
];

export function InterventionTypeRegistryPanel() {
  const { data: isMasterAdmin, isLoading: isAdminLoading } = useMasterAdmin();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deprecateType, setDeprecateType] = useState<RegistryType | null>(null);
  const [reactivateType, setReactivateType] = useState<RegistryType | null>(null);
  const [showDeprecated, setShowDeprecated] = useState(false);

  // Form state for adding new type
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Fetch all registry types (master admin sees all, including deprecated)
  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ["intervention-type-registry-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intervention_type_registry")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;
      return data as RegistryType[];
    },
    enabled: !!isMasterAdmin,
  });

  // Count references for each type
  const { data: referenceCounts = {} } = useQuery({
    queryKey: ["intervention-type-reference-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("intervention_type_id")
        .not("intervention_type_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const typeId = row.intervention_type_id;
        if (typeId) {
          counts[typeId] = (counts[typeId] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!isMasterAdmin,
  });

  // Add type mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("intervention_type_registry")
        .insert({
          name: newName.trim(),
          category: newCategory,
          description: newDescription.trim() || null,
          status: "active",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-type-registry-admin"] });
      setShowAddDialog(false);
      setNewName("");
      setNewCategory("");
      setNewDescription("");
      toast.success("Type added to registry");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add type: ${error.message}`);
    },
  });

  // Deprecate mutation (soft delete)
  const deprecateMutation = useMutation({
    mutationFn: async (typeId: string) => {
      const { error } = await supabase
        .from("intervention_type_registry")
        .update({ status: "deprecated" })
        .eq("id", typeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-type-registry-admin"] });
      setDeprecateType(null);
      toast.success("Type deprecated (historical references preserved)");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deprecate type: ${error.message}`);
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (typeId: string) => {
      const { error } = await supabase
        .from("intervention_type_registry")
        .update({ status: "active" })
        .eq("id", typeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-type-registry-admin"] });
      setReactivateType(null);
      toast.success("Type reactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate type: ${error.message}`);
    },
  });

  // Access guard
  if (isAdminLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking access...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isMasterAdmin) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Master admin access is required to manage the intervention type registry.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const activeTypes = types.filter((t) => t.status === "active");
  const deprecatedTypes = types.filter((t) => t.status === "deprecated");

  const groupedTypes = activeTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, RegistryType[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Intervention Type Registry
            </CardTitle>
            <CardDescription>
              Manage governance types. Types are deprecated, never deleted.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Type
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-medium">{activeTypes.length}</span> active types
          </div>
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{deprecatedTypes.length}</span> deprecated
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDeprecated(!showDeprecated)}
          >
            {showDeprecated ? "Hide" : "Show"} deprecated
          </Button>
        </div>

        <Separator />

        {typesLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading registry...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Types by Category */}
            {Object.entries(groupedTypes).map(([category, categoryTypes]) => (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryTypes.map((type) => (
                    <TypeRow
                      key={type.id}
                      type={type}
                      referenceCount={referenceCounts[type.id] || 0}
                      onDeprecate={() => setDeprecateType(type)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Deprecated Types */}
            {showDeprecated && deprecatedTypes.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Deprecated Types
                </h4>
                <div className="space-y-2">
                  {deprecatedTypes.map((type) => (
                    <TypeRow
                      key={type.id}
                      type={type}
                      referenceCount={referenceCounts[type.id] || 0}
                      onReactivate={() => setReactivateType(type)}
                      isDeprecated
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Type Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Intervention Type</DialogTitle>
            <DialogDescription>
              Add a new type to the governance registry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Type Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Process Automation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of when to use this type..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newName.trim() || !newCategory || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deprecate Confirmation */}
      <AlertDialog open={!!deprecateType} onOpenChange={() => setDeprecateType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Deprecate Type?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deprecateType?.name}</strong> will be deprecated. 
              It will no longer appear in dropdowns for new interventions, 
              but existing references ({referenceCounts[deprecateType?.id || ""] || 0}) will be preserved.
              <br /><br />
              You can reactivate this type later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deprecateType && deprecateMutation.mutate(deprecateType.id)}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {deprecateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Deprecate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation */}
      <AlertDialog open={!!reactivateType} onOpenChange={() => setReactivateType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reactivate Type?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{reactivateType?.name}</strong> will be reactivated and 
              appear in dropdowns for new interventions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reactivateType && reactivateMutation.mutate(reactivateType.id)}
            >
              {reactivateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function TypeRow({
  type,
  referenceCount,
  onDeprecate,
  onReactivate,
  isDeprecated = false,
}: {
  type: RegistryType;
  referenceCount: number;
  onDeprecate?: () => void;
  onReactivate?: () => void;
  isDeprecated?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isDeprecated ? "bg-muted/30 opacity-70" : "bg-background"
    }`}>
      <div className="flex items-center gap-3">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDeprecated ? "line-through" : ""}`}>
              {type.name}
            </span>
            {isDeprecated && (
              <Badge variant="secondary" className="text-xs">
                deprecated
              </Badge>
            )}
          </div>
          {type.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {type.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {referenceCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {referenceCount} reference{referenceCount !== 1 ? "s" : ""}
          </Badge>
        )}
        
        {isDeprecated ? (
          <Button variant="ghost" size="sm" onClick={onReactivate}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reactivate
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDeprecate}
            className="text-warning hover:text-warning"
          >
            <Archive className="h-4 w-4 mr-1" />
            Deprecate
          </Button>
        )}
      </div>
    </div>
  );
}
