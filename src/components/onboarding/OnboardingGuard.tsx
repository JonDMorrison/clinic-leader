import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
      // Skip check if already on onboarding or auth pages
      if (location.pathname === "/onboarding" || location.pathname === "/auth" || location.pathname === "/") {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        // Get user's team and onboarding status
        // Note: public.users.id is NOT the same as auth.users.id, so we query by email
        const { data: userData, error } = await supabase
          .from("users")
          .select("id, team_id, teams(onboarding_status)")
          .eq("email", user.email)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user data:", error);
          // On error, allow access to prevent blocking legitimate users
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        if (!userData?.team_id) {
          // No organization - needs onboarding
          setNeedsOnboarding(true);
          navigate("/onboarding");
          return;
        }

        const teamData = userData.teams as any;
        
        // Check if onboarding is incomplete
        // Only redirect to onboarding if status is explicitly 'draft' or null
        if (teamData?.onboarding_status === "draft" || !teamData?.onboarding_status) {
          console.log("Onboarding incomplete, status:", teamData?.onboarding_status);
          setNeedsOnboarding(true);
          navigate("/onboarding");
          return;
        }

        // Check if user has acknowledged core values
        // Use userData.id (public.users.id) not user.id (auth.users.id)
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

        console.log("Onboarding complete, status:", teamData?.onboarding_status);
        setLoading(false);
      } catch (error) {
        console.error("Error in onboarding guard:", error);
        // On error, allow access to prevent blocking users
        setNeedsOnboarding(false);
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
      <Dialog open={showCoreValuesStep} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" hideCloseButton>
          <CoreValuesOnboardingStep onComplete={() => setShowCoreValuesStep(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};
