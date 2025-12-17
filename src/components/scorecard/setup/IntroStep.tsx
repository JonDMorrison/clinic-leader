import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Sparkles, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IntroStepProps {
  onNext: () => void;
}

export const IntroStep = ({ onNext }: IntroStepProps) => {
  // Check if VTO exists
  const { data: vtoStatus, isLoading } = useQuery({
    queryKey: ["vto-exists-check"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return { hasVTO: false, goalCount: 0 };

      const { data: user } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", session.session.user.id)
        .single();

      if (!user?.team_id) return { hasVTO: false, goalCount: 0 };

      const { data: vto } = await supabase
        .from("vto")
        .select(`
          id,
          vto_versions(
            ten_year_target,
            three_year_picture,
            one_year_plan,
            quarterly_rocks
          )
        `)
        .eq("organization_id", user.team_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!vto?.vto_versions?.length) return { hasVTO: false, goalCount: 0 };

      // Count goals
      const version = vto.vto_versions[0] as any;
      let goalCount = 0;
      if (version.ten_year_target) goalCount++;
      if (version.three_year_picture?.revenue) goalCount++;
      if (version.three_year_picture?.expansion_items?.length) {
        goalCount += version.three_year_picture.expansion_items.length;
      }
      if (version.one_year_plan?.goals?.length) {
        goalCount += version.one_year_plan.goals.length;
      }
      if (version.quarterly_rocks?.length) {
        goalCount += version.quarterly_rocks.length;
      }

      return { hasVTO: true, goalCount };
    },
  });

  const hasVTO = vtoStatus?.hasVTO ?? false;
  const goalCount = vtoStatus?.goalCount ?? 0;

  return (
    <Card className="glass border-2">
      <CardContent className="p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Target className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground">
          Let's define what success looks like
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          You'll choose what metrics you want to track, who owns them, and how often they update.
        </p>

        {/* VTO Context */}
        {!isLoading && (
          <div className="max-w-md mx-auto">
            {hasVTO ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">V/TO Connected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  We found {goalCount} goals in your Vision Planner. On the next step, we'll suggest KPIs aligned to them.
                </p>
              </div>
            ) : (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Ready to start</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  No V/TO yet — that's okay! You can use industry templates or create custom metrics.
                </p>
              </div>
            )}
          </div>
        )}
        
        <Button 
          onClick={onNext}
          size="lg"
          className="gradient-brand mt-8"
          disabled={isLoading}
        >
          {isLoading ? "Checking..." : "Get Started"}
        </Button>
      </CardContent>
    </Card>
  );
};
