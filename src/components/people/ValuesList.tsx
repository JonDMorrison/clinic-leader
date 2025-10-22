import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Heart } from "lucide-react";

interface ValuesListProps {
  values: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export const ValuesList = ({ values }: ValuesListProps) => {
  return (
    <Card className="h-fit sticky top-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-brand" />
          <CardTitle>Core Values</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {values.length === 0 ? (
            <p className="text-sm text-muted-foreground">No core values defined yet.</p>
          ) : (
            values.map((value) => (
              <div key={value.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="brand" className="shrink-0">
                    {value.name}
                  </Badge>
                </div>
                {value.description && (
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
