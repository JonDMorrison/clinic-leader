import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, Users, AlertTriangle, Plus } from "lucide-react";
import { RecallList } from "@/components/recalls/RecallList";
import { BacklogBanner } from "@/components/recalls/BacklogBanner";
import { NewRecallModal } from "@/components/recalls/NewRecallModal";

export default function Recalls() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState("past-due");

  // Fetch metrics
  const { data: metrics } = useQuery({
    queryKey: ["recall-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recalls-metrics");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pastDue = metrics?.past_due || 0;
  const dueToday = metrics?.due_today || 0;
  const upcoming = metrics?.upcoming || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
            Daily Recalls
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage patient follow-ups and recall workflows
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Recall
        </Button>
      </div>

      {pastDue > 10 && (
        <BacklogBanner 
          pastDue={pastDue} 
          dueToday={dueToday} 
          upcoming={upcoming} 
        />
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 glass border-white/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Past Due</p>
              <p className="text-3xl font-bold text-destructive">{pastDue}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass border-white/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Today</p>
              <p className="text-3xl font-bold text-warning">{dueToday}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass border-white/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-3xl font-bold">{upcoming}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recalls List with Tabs */}
      <Card className="glass border-white/20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-white/10 p-4">
            <TabsList>
              <TabsTrigger value="past-due">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Past Due ({pastDue})
              </TabsTrigger>
              <TabsTrigger value="due-today">
                <Calendar className="h-4 w-4 mr-2" />
                Due Today ({dueToday})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                <Users className="h-4 w-4 mr-2" />
                Upcoming ({upcoming})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="past-due" className="p-6">
            <RecallList filterType="past-due" />
          </TabsContent>

          <TabsContent value="due-today" className="p-6">
            <RecallList filterType="due-today" />
          </TabsContent>

          <TabsContent value="upcoming" className="p-6">
            <RecallList filterType="upcoming" />
          </TabsContent>
        </Tabs>
      </Card>

      <NewRecallModal open={showNewModal} onOpenChange={setShowNewModal} />
    </div>
  );
}
