import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CoreValuesOnboardingStep } from "@/components/core-values/CoreValuesOnboardingStep";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showCoreValuesStep, setShowCoreValuesStep] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Public routes that don't require authentication
      const publicRoutes = ["/onboarding", "/auth", "/", "/security", "/data-safety", "/jane-compliance"];
      if (publicRoutes.includes(location.pathname)) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          logger.info("No authenticated user found, redirecting to /auth", { component: "OnboardingGuard" });
          navigate("/auth");
          return;
        }

        logger.info("Checking onboarding status for user", {
          component: "OnboardingGuard",
          userId: user.id,
          email: user.email
        });

        // Get user's team and onboarding status
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select(`
            *,
            teams (
              onboarding_status
            )
          `)
          .eq('email', user.email)
          .single();

        if (dbError) {
          logger.error("Failed to fetch user data from public schema", dbError, {
            component: "OnboardingGuard",
            email: user.email
          });
          // Fix: Fail-closed. If we can't verify status, don't let them in.
          setLoading(false);
          return;
        }

        if (!userData?.team_id) {
          logger.info("User has no team_id, redirecting to onboarding", { component: "OnboardingGuard" });
          setNeedsOnboarding(true);
          if (location.pathname !== "/onboarding") {
            navigate("/onboarding", { replace: true });
          }
          setLoading(false);
          return;
        }

        const teamData = userData.teams as any;

        // Check if onboarding is incomplete
        // Only redirect to onboarding if status is explicitly 'draft' or null
        if (!teamData?.onboarding_status || teamData?.onboarding_status === "draft") {
          logger.info("Onboarding incomplete, redirecting", {
            component: "OnboardingGuard",
            status: teamData?.onboarding_status
          });
          setNeedsOnboarding(true);
          if (location.pathname !== "/onboarding") {
            navigate("/onboarding", { replace: true });
          }
          setLoading(false);
          return;
        }

        // Check if user has acknowledged core values
        try {
          const { data: ack } = await supabase
            .from("core_values_ack")
            .select("id")
            .eq("user_id", userData.id)
            .eq("organization_id", userData.team_id)
            .maybeSingle();

          if (!ack) {
            // Check if org has core values set up
            const { data: coreValues } = await supabase
              .from("org_core_values")
              .select("id")
              .eq("organization_id", userData.team_id)
              .eq("is_active", true)
              .limit(1);

            if (coreValues && coreValues.length > 0) {
              setShowCoreValuesStep(true);
            }
          }
        } catch (coreValuesError) {
          logger.error("Error checking core values commitment", coreValuesError, { component: "OnboardingGuard" });
        }

        setNeedsOnboarding(false);
        setLoading(false);
      } catch (error) {
        logger.error("Critical error in onboarding guard", error as Error, { component: "OnboardingGuard" });
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return null;
  }

  return (
    <>
      {children}

      {/* Core Values Commitment Modal */}
      <Dialog open={showCoreValuesStep} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" hideCloseButton>
          <CoreValuesOnboardingStep onComplete={() => setShowCoreValuesStep(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
