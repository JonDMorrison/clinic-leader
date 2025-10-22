import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/Badge";
import { Users, FileCheck, TrendingUp } from "lucide-react";

interface Doc {
  id: string;
  title: string;
  requires_ack: boolean;
  acknowledgements?: Array<{ user_id: string; quiz_score: number | null }>;
}

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  team_id: string | null;
}

interface ManagerDashboardProps {
  docs: Doc[];
  teams: Team[];
  users: User[];
}

export const ManagerDashboard = ({ docs, teams, users }: ManagerDashboardProps) => {
  const docsRequiringAck = docs.filter((d) => d.requires_ack);

  const getCompletionRate = (doc: Doc) => {
    const totalUsers = users.length;
    const acknowledgedCount = doc.acknowledgements?.length || 0;
    return totalUsers > 0 ? Math.round((acknowledgedCount / totalUsers) * 100) : 0;
  };

  const getTeamCompletionRate = (team: Team) => {
    const teamUsers = users.filter((u) => u.team_id === team.id);
    if (teamUsers.length === 0) return 0;

    let totalAcks = 0;
    let totalRequired = 0;

    docsRequiringAck.forEach((doc) => {
      totalRequired += teamUsers.length;
      teamUsers.forEach((user) => {
        if (doc.acknowledgements?.some((ack) => ack.user_id === user.id)) {
          totalAcks++;
        }
      });
    });

    return totalRequired > 0 ? Math.round((totalAcks / totalRequired) * 100) : 0;
  };

  const getAverageQuizScore = (doc: Doc) => {
    const scoresWithQuiz = doc.acknowledgements?.filter((ack) => ack.quiz_score !== null);
    if (!scoresWithQuiz || scoresWithQuiz.length === 0) return null;

    const sum = scoresWithQuiz.reduce((acc, ack) => acc + (ack.quiz_score || 0), 0);
    return Math.round(sum / scoresWithQuiz.length);
  };

  const overallCompletionRate = () => {
    if (docsRequiringAck.length === 0 || users.length === 0) return 0;

    let totalAcks = 0;
    let totalRequired = docsRequiringAck.length * users.length;

    docsRequiringAck.forEach((doc) => {
      totalAcks += doc.acknowledgements?.length || 0;
    });

    return Math.round((totalAcks / totalRequired) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCompletionRate()}%</div>
            <Progress value={overallCompletionRate()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Docs Requiring Ack</CardTitle>
              <FileCheck className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{docsRequiringAck.length}</div>
            <p className="text-xs text-muted-foreground mt-2">out of {docs.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-2">across {teams.length} teams</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {docsRequiringAck.map((doc) => {
              const completionRate = getCompletionRate(doc);
              const avgQuizScore = getAverageQuizScore(doc);

              return (
                <div key={doc.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{doc.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">{completionRate}%</Badge>
                      {avgQuizScore !== null && (
                        <Badge variant="brand">Quiz: {avgQuizScore}%</Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={completionRate} />
                  <p className="text-xs text-muted-foreground">
                    {doc.acknowledgements?.length || 0} of {users.length} users acknowledged
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map((team) => {
              const completionRate = getTeamCompletionRate(team);
              const teamUserCount = users.filter((u) => u.team_id === team.id).length;

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{team.name}</span>
                    <Badge variant="muted">{completionRate}%</Badge>
                  </div>
                  <Progress value={completionRate} />
                  <p className="text-xs text-muted-foreground">
                    {teamUserCount} team members
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
