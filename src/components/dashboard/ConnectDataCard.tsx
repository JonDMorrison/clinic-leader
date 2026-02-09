import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";

export const ConnectDataCard = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  // Check if Jane is connected
  const { data: janeConnector, isLoading } = useQuery({
    queryKey: ["jane-connector-quick", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      
      const { data } = await supabase
        .from("bulk_analytics_connectors")
        .select("status")
        .eq("organization_id", currentUser.team_id)
        .eq("source_system", "jane")
        .maybeSingle();
      
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  if (isLoading) return null;

  // Don't show if already connected
  if (janeConnector?.status === "active") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden border-brand/30 bg-gradient-to-br from-brand/10 via-background to-accent/10">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-brand/5 via-accent/5 to-brand/5 opacity-50"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        <CardContent className="relative z-10 pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-brand/20 flex-shrink-0">
              <Database className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1">Your Scorecard Starts Here</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your data source, then choose which metrics to track on your scorecard.
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                <li className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-brand" />
                  <span>Automatic daily updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span>No login credentials needed</span>
                </li>
              </ul>
              <Button 
                className="gradient-brand"
                onClick={() => navigate("/data")}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
