import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

interface GWCAssessmentHistoryProps {
  userId: string;
}

export function GWCAssessmentHistory({ userId }: GWCAssessmentHistoryProps) {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["gwc-assessments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gwc_assessments")
        .select(`
          *,
          assessor:users!assessed_by(full_name)
        `)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("assessment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getRatingBadgeVariant = (rating: string | null) => {
    if (rating === "+") return "default";
    if (rating === "±") return "secondary";
    if (rating === "-") return "destructive";
    return "outline";
  };

  const getRatingColor = (rating: string | null) => {
    if (rating === "+") return "text-green-600";
    if (rating === "±") return "text-amber-600";
    if (rating === "-") return "text-red-600";
    return "text-muted-foreground";
  };

  const getTrendIcon = (current: string | null, previous: string | null) => {
    const ratingValues: Record<string, number> = { "+": 3, "±": 2, "-": 1 };
    const currentValue = current ? ratingValues[current] || 0 : 0;
    const previousValue = previous ? ratingValues[previous] || 0 : 0;

    if (currentValue > previousValue) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (currentValue < previousValue) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No assessment history available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment, index) => {
        const previousAssessment = index < assessments.length - 1 ? assessments[index + 1] : null;

        return (
          <Card key={assessment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{assessment.quarter}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(assessment.assessment_date), "MMMM d, yyyy")}
                    {assessment.assessor && (
                      <span className="ml-2">
                        • Assessed by {assessment.assessor.full_name}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant={assessment.assessment_type === "manager" ? "default" : "secondary"}>
                  {assessment.assessment_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Gets It</p>
                    {previousAssessment && getTrendIcon(assessment.gets_it_rating, previousAssessment.gets_it_rating)}
                  </div>
                  <Badge 
                    variant={getRatingBadgeVariant(assessment.gets_it_rating)}
                    className="w-full justify-center"
                  >
                    <span className={getRatingColor(assessment.gets_it_rating)}>
                      {assessment.gets_it_rating || "N/A"}
                    </span>
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Wants It</p>
                    {previousAssessment && getTrendIcon(assessment.wants_it_rating, previousAssessment.wants_it_rating)}
                  </div>
                  <Badge 
                    variant={getRatingBadgeVariant(assessment.wants_it_rating)}
                    className="w-full justify-center"
                  >
                    <span className={getRatingColor(assessment.wants_it_rating)}>
                      {assessment.wants_it_rating || "N/A"}
                    </span>
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Capacity</p>
                    {previousAssessment && getTrendIcon(assessment.capacity_rating, previousAssessment.capacity_rating)}
                  </div>
                  <Badge 
                    variant={getRatingBadgeVariant(assessment.capacity_rating)}
                    className="w-full justify-center"
                  >
                    <span className={getRatingColor(assessment.capacity_rating)}>
                      {assessment.capacity_rating || "N/A"}
                    </span>
                  </Badge>
                </div>
              </div>

              {assessment.overall_notes && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium mb-1">Overall Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {assessment.overall_notes}
                  </p>
                </div>
              )}

              {assessment.action_items && (
                <div className="mt-2 rounded-lg bg-primary/5 p-3">
                  <p className="text-sm font-medium mb-1">Action Items</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {assessment.action_items}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
