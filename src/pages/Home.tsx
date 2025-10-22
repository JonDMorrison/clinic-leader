import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";

const Home = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your clinic overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Stat
            label="Active Patients"
            value="1,234"
            icon={<Users className="w-5 h-5" />}
            trend={{ value: 12, isPositive: true }}
          />
        </Card>
        <Card>
          <Stat
            label="Completed Rocks"
            value="8/12"
            icon={<Target className="w-5 h-5" />}
          />
        </Card>
        <Card>
          <Stat
            label="Open Issues"
            value="5"
            icon={<AlertCircle className="w-5 h-5" />}
            trend={{ value: -20, isPositive: true }}
          />
        </Card>
        <Card>
          <Stat
            label="Team Score"
            value="87%"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: 5, isPositive: true }}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scorecard Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiSparkline data={[65, 72, 68, 75, 80, 85, 87]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-success mt-2" />
                <div>
                  <p className="text-sm font-medium">Rock completed</p>
                  <p className="text-xs text-muted-foreground">Improve patient satisfaction by 15%</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                <div>
                  <p className="text-sm font-medium">Issue added</p>
                  <p className="text-xs text-muted-foreground">Front desk scheduling conflicts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand mt-2" />
                <div>
                  <p className="text-sm font-medium">L10 meeting scheduled</p>
                  <p className="text-xs text-muted-foreground">Tomorrow at 10:00 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
