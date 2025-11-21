import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface Assessment {
  gets_it_rating: string | null;
  gets_it_notes: string;
  wants_it_rating: string | null;
  wants_it_notes: string;
  capacity_rating: string | null;
  capacity_notes: string;
  overall_notes: string;
  action_items: string;
}

interface GWCComparisonViewProps {
  selfAssessment: Assessment | null;
  managerAssessment: Assessment | null;
  userName: string;
  managerName: string;
}

export function GWCComparisonView({
  selfAssessment,
  managerAssessment,
  userName,
  managerName,
}: GWCComparisonViewProps) {
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

  const hasDiscrepancy = (selfRating: string | null, managerRating: string | null) => {
    return selfRating !== managerRating;
  };

  const ComparisonSection = ({ 
    title, 
    selfRating, 
    selfNotes, 
    managerRating, 
    managerNotes 
  }: {
    title: string;
    selfRating: string | null;
    selfNotes: string;
    managerRating: string | null;
    managerNotes: string;
  }) => {
    const discrepancy = hasDiscrepancy(selfRating, managerRating);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {discrepancy && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Discuss
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{userName} (Self)</p>
              <Badge 
                variant={getRatingBadgeVariant(selfRating)}
                className="mb-3"
              >
                <span className={getRatingColor(selfRating)}>
                  {selfRating || "Not rated"}
                </span>
              </Badge>
              {selfNotes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selfNotes}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{managerName} (Manager)</p>
              <Badge 
                variant={getRatingBadgeVariant(managerRating)}
                className="mb-3"
              >
                <span className={getRatingColor(managerRating)}>
                  {managerRating || "Not rated"}
                </span>
              </Badge>
              {managerNotes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {managerNotes}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!selfAssessment && !managerAssessment) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No assessments available to compare.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Quarterly Conversation Guide</CardTitle>
          <CardDescription>
            Review the self and manager assessments side-by-side. Discuss any discrepancies and work together to agree on final ratings.
          </CardDescription>
        </CardHeader>
      </Card>

      <ComparisonSection
        title="Gets It"
        selfRating={selfAssessment?.gets_it_rating || null}
        selfNotes={selfAssessment?.gets_it_notes || ""}
        managerRating={managerAssessment?.gets_it_rating || null}
        managerNotes={managerAssessment?.gets_it_notes || ""}
      />

      <ComparisonSection
        title="Wants It"
        selfRating={selfAssessment?.wants_it_rating || null}
        selfNotes={selfAssessment?.wants_it_notes || ""}
        managerRating={managerAssessment?.wants_it_rating || null}
        managerNotes={managerAssessment?.wants_it_notes || ""}
      />

      <ComparisonSection
        title="Capacity to Do It"
        selfRating={selfAssessment?.capacity_rating || null}
        selfNotes={selfAssessment?.capacity_notes || ""}
        managerRating={managerAssessment?.capacity_rating || null}
        managerNotes={managerAssessment?.capacity_notes || ""}
      />
    </div>
  );
}
