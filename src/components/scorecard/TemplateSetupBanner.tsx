import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload, Settings, Lock } from "lucide-react";
import { motion } from "framer-motion";

export function TemplateSetupBanner() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings-banner', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: metricsCount } = useQuery({
    queryKey: ['metrics-count-banner', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return 0;
      const { count, error } = await supabase
        .from('metrics')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentUser?.team_id,
  });

  // Only show for aligned mode and for admin users
  if (!orgSettings || orgSettings.scorecard_mode !== 'aligned') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-brand/30 bg-gradient-to-r from-brand/5 to-accent/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-brand/10">
                <Lock className="w-5 h-5 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Monthly Scorecard Template</h3>
                  <Badge variant="outline" className="border-brand text-brand text-xs">
                    Locked Mode
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {metricsCount} metrics defined • AI will not create new metrics automatically
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/scorecard/template')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Template
              </Button>
              <Button 
                size="sm"
                className="gradient-brand"
                onClick={() => navigate('/imports/monthly-report')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Monthly Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
