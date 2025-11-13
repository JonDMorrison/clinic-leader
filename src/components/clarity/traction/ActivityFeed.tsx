import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Link2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
  type: "update" | "link" | "complete" | "risk";
}

// Mock activity data
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    user: "Sarah Chen",
    action: "completed",
    target: "Q1 Revenue Growth",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: "complete",
  },
  {
    id: "2",
    user: "Mike Johnson",
    action: "linked KPI to",
    target: "Expand Team",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    type: "link",
  },
  {
    id: "3",
    user: "Emily Davis",
    action: "marked at risk",
    target: "New Marketing Campaign",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    type: "risk",
  },
  {
    id: "4",
    user: "Tom Wilson",
    action: "updated",
    target: "Hire 3 Practitioners",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    type: "update",
  },
];

const ACTIVITY_ICONS = {
  update: User,
  link: Link2,
  complete: CheckCircle2,
  risk: AlertTriangle,
};

const ACTIVITY_COLORS = {
  update: "text-blue-500",
  link: "text-purple-500",
  complete: "text-green-500",
  risk: "text-yellow-500",
};

export function ActivityFeed() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {MOCK_ACTIVITIES.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.type];
              const colorClass = ACTIVITY_COLORS[activity.type];

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-1 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{" "}
                      <span className="text-muted-foreground">{activity.action}</span>{" "}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
