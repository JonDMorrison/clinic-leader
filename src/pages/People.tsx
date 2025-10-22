import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users } from "lucide-react";

const People = () => {
  const team = [
    {
      name: "Dr. Sarah Johnson",
      role: "Visionary",
      department: "Leadership",
      status: "active",
    },
    {
      name: "Mike Davis",
      role: "Integrator",
      department: "Operations",
      status: "active",
    },
    {
      name: "Emily Chen",
      role: "Office Manager",
      department: "Administration",
      status: "active",
    },
    {
      name: "John Smith",
      role: "Clinical Lead",
      department: "Clinical",
      status: "active",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">People</h1>
        <p className="text-muted-foreground">Team directory and organizational structure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {team.map((member) => (
          <Card key={member.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{member.role}</p>
                  </div>
                </div>
                <Badge variant="success">{member.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Department: {member.department}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default People;
