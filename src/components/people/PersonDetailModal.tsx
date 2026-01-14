import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, ChevronDown, Target, AlertCircle, CheckCircle2, Calendar, Plus, Activity, DollarSign, TrendingUp, TrendingDown, Link2, ExternalLink, User2, Armchair } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { GWCAssessmentForm } from "./GWCAssessmentForm";
import { GWCAssessmentHistory } from "./GWCAssessmentHistory";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useUserSeatMetrics } from "@/hooks/useSeatMetrics";
import { useNavigate } from "react-router-dom";
import { LinkToJaneClinicianModal } from "./LinkToJaneClinicianModal";

interface PersonDetailModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  isManager: boolean;
  onUpdate: () => void;
}

type ValueRating = "+" | "±" | "-";

interface CoreValue {
  id: string;
  name: string;
  description: string | null;
}

interface ValueRatingData {
  id: string;
  rating: ValueRating;
  notes: string | null;
  value_id: string;
}

export function PersonDetailModal({ userId, isOpen, onClose, isManager, onUpdate }: PersonDetailModalProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showLinkClinicianModal, setShowLinkClinicianModal] = useState(false);
  
  // Fetch user's seat metrics (accountability)
  const { metrics: seatMetrics, seats: userSeats, isLoading: loadingSeatMetrics } = useUserSeatMetrics(
    userId || undefined,
    currentUser?.team_id
  );
  
  // Fetch user's linked metrics
  const { summary: userMetrics, isLinked: hasLinkedMetrics } = useUserMetrics(
    userId || undefined,
    currentUser?.team_id
  );

  // Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user-detail", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*, seats(title, responsibilities)")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOpen,
  });

  // Fetch core values
  const { data: coreValues = [] } = useQuery({
    queryKey: ["core-values"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_values")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CoreValue[];
    },
    enabled: isOpen,
  });

  // Fetch value ratings
  const { data: valueRatings = [], refetch: refetchRatings } = useQuery({
    queryKey: ["value-ratings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("value_ratings")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOpen,
  });

  // Fetch workload data
  const { data: rocks = [] } = useQuery({
    queryKey: ["user-rocks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("rocks")
        .select("id, title, status")
        .eq("owner_id", userId)
        .neq("status", "done");
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOpen,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["user-issues", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("issues")
        .select("id, title, status")
        .eq("owner_id", userId)
        .neq("status", "solved");
      if (error) throw error;
      return data;
    },
    enabled: !!userId && isOpen,
  });

  // Initialize local notes when user data loads
  useEffect(() => {
    if (user?.manager_notes) {
      setLocalNotes(user.manager_notes);
    } else {
      setLocalNotes("");
    }
  }, [user?.manager_notes]);

  const getUserRating = (valueId: string): ValueRatingData | undefined => {
    return valueRatings.find((r) => r.value_id === valueId);
  };

  const handleRatingChange = async (valueId: string, newRating: ValueRating) => {
    if (!isManager || !userId) return;

    const existingRating = getUserRating(valueId);

    try {
      if (existingRating) {
        const { error } = await supabase
          .from("value_ratings")
          .update({ rating: newRating, updated_at: new Date().toISOString() })
          .eq("id", existingRating.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("value_ratings")
          .insert({
            user_id: userId,
            value_id: valueId,
            rating: newRating,
          } as any);
        if (error) throw error;
      }
      refetchRatings();
      onUpdate();
    } catch (error) {
      console.error("Error updating rating:", error);
      toast({ title: "Error", description: "Failed to update rating", variant: "destructive" });
    }
  };

  const handleNotesChange = async (valueId: string, notes: string) => {
    if (!isManager || !userId) return;

    const existingRating = getUserRating(valueId);

    try {
      if (existingRating) {
        const { error } = await supabase
          .from("value_ratings")
          .update({ notes, updated_at: new Date().toISOString() })
          .eq("id", existingRating.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("value_ratings")
          .insert({
            user_id: userId,
            value_id: valueId,
            rating: "±",
            notes,
          } as any);
        if (error) throw error;
      }
      refetchRatings();
      onUpdate();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({ title: "Error", description: "Failed to update notes", variant: "destructive" });
    }
  };

  const handleGWCChange = async (field: "gwc_gets_it" | "gwc_wants_it" | "gwc_capacity", checked: boolean) => {
    if (!isManager || !userId) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ [field]: checked })
        .eq("id", userId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
      onUpdate();
    } catch (error) {
      console.error("Error updating GWC:", error);
      toast({ title: "Error", description: "Failed to update GWC", variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (!isManager || !userId) return;

    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ manager_notes: localNotes })
        .eq("id", userId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
      toast({ title: "Success", description: "Manager notes saved" });
      onUpdate();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;

    try {
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (rolesError) throw rolesError;

      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);
      if (userError) throw userError;

      toast({ title: "Success", description: "User deleted successfully" });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  };

  if (!userId || !user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRatingBadgeVariant = (rating?: ValueRating) => {
    if (!rating) return "outline";
    switch (rating) {
      case "+":
        return "default";
      case "±":
        return "secondary";
      case "-":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRatingLabel = (rating?: ValueRating) => {
    if (!rating) return "Not Rated";
    return rating;
  };

  // Calculate Right Person indicator
  const allValuesPositive = coreValues.length > 0 && coreValues.every((value) => {
    const rating = getUserRating(value.id);
    return rating && (rating.rating === "+" || rating.rating === "±");
  });

  // Calculate Right Seat indicator
  const gwcAllChecked = user.gwc_gets_it && user.gwc_wants_it && user.gwc_capacity;
  const hasSeats = user.seats && (Array.isArray(user.seats) ? user.seats.length > 0 : true);
  const rightSeat = gwcAllChecked && hasSeats;

  const getRightPersonRightSeatStatus = () => {
    if (allValuesPositive && rightSeat) return { label: "Right Person, Right Seat", variant: "default" as const, icon: CheckCircle2 };
    if (allValuesPositive || rightSeat) return { label: "Partially Aligned", variant: "secondary" as const, icon: AlertCircle };
    return { label: "Needs Attention", variant: "destructive" as const, icon: AlertCircle };
  };

  const rprsStatus = getRightPersonRightSeatStatus();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <UserAvatar user={user} size="xl" />
                <div>
                  <div className="text-2xl font-bold">{user.full_name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{user.role}</Badge>
                    {user.hire_date && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Hired {format(new Date(user.hire_date), "MMM yyyy")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {isManager && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="gwc-assessment">GWC Assessment</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Right Person, Right Seat Indicator */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-2">
                <rprsStatus.icon className="h-5 w-5" />
                <h3 className="font-semibold">Right Person, Right Seat</h3>
              </div>
              <Badge variant={rprsStatus.variant} className="mb-3">
                {rprsStatus.label}
              </Badge>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Right Person</div>
                  <div className="text-muted-foreground">
                    {allValuesPositive ? "✓ Aligned with core values" : "Needs value alignment review"}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Right Seat</div>
                  <div className="text-muted-foreground">
                    {rightSeat ? "✓ GWC complete + seat assigned" : gwcAllChecked ? "GWC complete, assign seat" : "Complete GWC assessment"}
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Mapping: Link to Jane Clinician */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Clinician Identity</h3>
                </div>
                {isManager && (
                  <Button variant="outline" size="sm" onClick={() => setShowLinkClinicianModal(true)}>
                    <Link2 className="h-3 w-3 mr-1" />
                    {hasLinkedMetrics ? "Change" : "Link"}
                  </Button>
                )}
              </div>
              {hasLinkedMetrics ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">Linked to: </span>
                  <Badge variant="secondary">{userMetrics.dimensionLabel}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not linked to any Jane clinician data.</p>
              )}
            </div>

            {/* My Clinician Numbers (Attribution) */}
            {hasLinkedMetrics && (
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">My Clinician Numbers</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">Attribution</Badge>
                </div>
                
                {userMetrics.totalVisits !== null || userMetrics.totalInvoiced !== null ? (
                  <div className="grid grid-cols-2 gap-4">
                    {userMetrics.totalVisits !== null && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Visits This Week</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{userMetrics.totalVisits}</span>
                          {userMetrics.visitsTrend !== null && (
                            <span className={`flex items-center gap-0.5 text-sm ${
                              userMetrics.visitsTrend > 0 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : userMetrics.visitsTrend < 0 
                                  ? "text-destructive" 
                                  : "text-muted-foreground"
                            }`}>
                              {userMetrics.visitsTrend > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : userMetrics.visitsTrend < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : null}
                              {userMetrics.visitsTrend !== 0 && `${Math.abs(userMetrics.visitsTrend)}%`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">vs last week</div>
                      </div>
                    )}
                    
                    {userMetrics.totalInvoiced !== null && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Invoiced This Week</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            ${userMetrics.totalInvoiced >= 1000 
                              ? `${(userMetrics.totalInvoiced / 1000).toFixed(1)}k`
                              : userMetrics.totalInvoiced.toFixed(0)
                            }
                          </span>
                          {userMetrics.invoicedTrend !== null && (
                            <span className={`flex items-center gap-0.5 text-sm ${
                              userMetrics.invoicedTrend > 0 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : userMetrics.invoicedTrend < 0 
                                  ? "text-destructive" 
                                  : "text-muted-foreground"
                            }`}>
                              {userMetrics.invoicedTrend > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : userMetrics.invoicedTrend < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : null}
                              {userMetrics.invoicedTrend !== 0 && `${Math.abs(userMetrics.invoicedTrend)}%`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">vs last week</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Linked to clinician data, but no metrics available for this week.
                  </div>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={() => {
                    onClose();
                    navigate("/data");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Data Breakdown
                </Button>
              </div>
            )}

            {/* My Seat Numbers (Accountability) */}
            {seatMetrics.length > 0 && (
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">My Seat Numbers</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">Accountability</Badge>
                </div>
                <div className="space-y-2">
                  {seatMetrics.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <span className="text-sm font-medium">{m.dimension_label || m.import_key.replace(/^jane_/, "").replace(/_/g, " ")}</span>
                        <span className="text-xs text-muted-foreground ml-2">({m.seatTitle})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{m.currentValue ?? "—"}</span>
                        {m.trend !== null && m.trend !== 0 && (
                          <span className={m.trend > 0 ? "text-emerald-600" : "text-destructive"}>
                            {m.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seat Assignment */}
            {user.seats && Array.isArray(user.seats) && user.seats.length > 0 && (
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold mb-3">Seat Assignment</h3>
                {user.seats.map((seat: any, idx: number) => (
                  <div key={idx} className="mb-2">
                    <div className="font-medium">{seat.title}</div>
                    {seat.responsibilities && Array.isArray(seat.responsibilities) && seat.responsibilities.length > 0 && (
                      <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                        {seat.responsibilities.map((resp: string, i: number) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* GWC Assessment */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">GWC Assessment</h3>
                {gwcAllChecked && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All Green
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={user.gwc_gets_it || false}
                    onCheckedChange={(checked) => handleGWCChange("gwc_gets_it", checked as boolean)}
                    disabled={!isManager}
                  />
                  <div>
                    <Label className="font-medium">Gets It</Label>
                    <p className="text-sm text-muted-foreground">Understands the role and responsibilities</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={user.gwc_wants_it || false}
                    onCheckedChange={(checked) => handleGWCChange("gwc_wants_it", checked as boolean)}
                    disabled={!isManager}
                  />
                  <div>
                    <Label className="font-medium">Wants It</Label>
                    <p className="text-sm text-muted-foreground">Desires to do the job and is passionate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={user.gwc_capacity || false}
                    onCheckedChange={(checked) => handleGWCChange("gwc_capacity", checked as boolean)}
                    disabled={!isManager}
                  />
                  <div>
                    <Label className="font-medium">Capacity to Do It</Label>
                    <p className="text-sm text-muted-foreground">Has the time, skills, and mental/emotional capacity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Values Assessment */}
            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-3">Core Values Assessment</h3>
              <div className="space-y-4">
                {coreValues.map((value) => {
                  const rating = getUserRating(value.id);
                  return (
                    <Collapsible key={value.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <div className="flex-1">
                            <div className="font-medium">{value.name}</div>
                            {value.description && (
                              <div className="text-sm text-muted-foreground">{value.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isManager ? (
                            <>
                              <Button
                                variant={rating?.rating === "+" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleRatingChange(value.id, "+")}
                              >
                                +
                              </Button>
                              <Button
                                variant={rating?.rating === "±" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => handleRatingChange(value.id, "±")}
                              >
                                ±
                              </Button>
                              <Button
                                variant={rating?.rating === "-" ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => handleRatingChange(value.id, "-")}
                              >
                                -
                              </Button>
                            </>
                          ) : (
                            <Badge variant={getRatingBadgeVariant(rating?.rating)}>
                              {getRatingLabel(rating?.rating)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CollapsibleContent className="mt-2">
                        <Textarea
                          placeholder="Notes..."
                          value={rating?.notes || ""}
                          onChange={(e) => handleNotesChange(value.id, e.target.value)}
                          disabled={!isManager}
                          className="min-h-[60px]"
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>

            {/* Workload Overview */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5" />
                <h3 className="font-semibold">Workload Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{rocks.length}</div>
                  <div className="text-sm text-muted-foreground">Active Rocks</div>
                  {rocks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rocks.slice(0, 3).map((rock) => (
                        <li key={rock.id} className="text-sm truncate">• {rock.title}</li>
                      ))}
                      {rocks.length > 3 && (
                        <li className="text-sm text-muted-foreground">+ {rocks.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold">{issues.length}</div>
                  <div className="text-sm text-muted-foreground">Open Issues</div>
                  {issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {issues.slice(0, 3).map((issue) => (
                        <li key={issue.id} className="text-sm truncate">• {issue.title}</li>
                      ))}
                      {issues.length > 3 && (
                        <li className="text-sm text-muted-foreground">+ {issues.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Manager Notes */}
            {isManager && (
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold mb-3">Manager Notes</h3>
                <Textarea
                  placeholder="Ongoing observations, feedback, development areas..."
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
                    {isSavingNotes ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              </div>
            )}
            </TabsContent>

            <TabsContent value="gwc-assessment" className="space-y-4 mt-4">
              {showAssessmentForm ? (
                <GWCAssessmentForm
                  userId={userId!}
                  assessedBy={currentUser?.id || ""}
                  assessmentType="manager"
                  onSuccess={() => {
                    setShowAssessmentForm(false);
                    queryClient.invalidateQueries({ queryKey: ["gwc-assessments", userId] });
                    toast({ title: "Assessment completed", description: "GWC assessment has been saved successfully." });
                  }}
                  onCancel={() => setShowAssessmentForm(false)}
                />
              ) : (
                <div className="space-y-4">
                  {isManager && (
                    <Button onClick={() => setShowAssessmentForm(true)} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      New GWC Assessment
                    </Button>
                  )}
                  <GWCAssessmentHistory userId={userId!} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <GWCAssessmentHistory userId={userId!} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {user.full_name}? This will remove all their data including value ratings, rocks, and issues. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link to Jane Clinician Modal */}
      <LinkToJaneClinicianModal
        open={showLinkClinicianModal}
        onClose={() => setShowLinkClinicianModal(false)}
        userId={userId}
        userName={user.full_name}
        currentJaneGuid={user.jane_staff_member_guid}
      />
    </>
  );
}
