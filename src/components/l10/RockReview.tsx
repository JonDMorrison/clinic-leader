import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Target } from "lucide-react";

interface RockReviewProps {
  rocks: any[];
}

export const RockReview = ({ rocks }: RockReviewProps) => {
  const getStatusBadge = (status: string) => {
    if (status === "done") return { variant: "success", label: "Done" };
    if (status === "off_track") return { variant: "danger", label: "Off Track" };
    return { variant: "warning", label: "On Track" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rock Review (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Are all rocks on track? Any blockers?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rocks.map((rock) => {
            const statusBadge = getStatusBadge(rock.status);
            
            return (
              <div
                key={rock.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-brand" />
                  <div>
                    <p className="font-medium">{rock.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {rock.users?.full_name || "Unassigned"} • {rock.quarter}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {rock.confidence && (
                    <span className="text-sm text-muted-foreground">
                      {rock.confidence}% confident
                    </span>
                  )}
                  <Badge variant={statusBadge.variant as "success" | "danger" | "warning"}>
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
