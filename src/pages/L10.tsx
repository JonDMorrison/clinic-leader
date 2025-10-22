import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "lucide-react";

const L10 = () => {
  const meetings = [
    {
      date: "Jan 22, 2025",
      time: "10:00 AM",
      status: "upcoming",
      agenda: ["Scorecard Review", "Rock Updates", "Issue Resolution"],
    },
    {
      date: "Jan 15, 2025",
      time: "10:00 AM",
      status: "completed",
      notes: "Discussed Q1 priorities and patient satisfaction improvements",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Level 10 Meetings</h1>
        <p className="text-muted-foreground">Weekly leadership team meetings</p>
      </div>

      <div className="grid gap-6">
        {meetings.map((meeting, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-brand mt-1" />
                  <div>
                    <CardTitle>{meeting.date}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{meeting.time}</p>
                  </div>
                </div>
                <Badge variant={meeting.status === "upcoming" ? "brand" : "success"}>
                  {meeting.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {meeting.agenda && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Agenda</h4>
                  <ul className="space-y-1">
                    {meeting.agenda.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {meeting.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{meeting.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default L10;
