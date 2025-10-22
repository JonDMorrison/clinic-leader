import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Target } from "lucide-react";

const Rocks = () => {
  const rocks = [
    {
      title: "Implement new patient portal",
      owner: "Sarah Johnson",
      dueDate: "Q1 2025",
      progress: 75,
      status: "success",
    },
    {
      title: "Launch marketing campaign",
      owner: "Mike Davis",
      dueDate: "Q1 2025",
      progress: 45,
      status: "warning",
    },
    {
      title: "Hire 2 new nurses",
      owner: "HR Team",
      dueDate: "Q2 2025",
      progress: 30,
      status: "muted",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Rocks</h1>
        <p className="text-muted-foreground">90-day priorities and goals</p>
      </div>

      <div className="grid gap-6">
        {rocks.map((rock) => (
          <Card key={rock.title}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-brand mt-1" />
                  <div>
                    <CardTitle>{rock.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Owner: {rock.owner} • Due: {rock.dueDate}
                    </p>
                  </div>
                </div>
                <Badge variant={rock.status as "success" | "warning" | "muted"}>
                  {rock.progress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-brand h-2 rounded-full transition-all"
                  style={{ width: `${rock.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Rocks;
