import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
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
        const { data: userData, error } = await supabase
          .from("users")
          .select("team_id, teams(onboarding_status)")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
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
        if (!teamData?.onboarding_status || teamData.onboarding_status === "draft") {
          setNeedsOnboarding(true);
          navigate("/onboarding");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in onboarding guard:", error);
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

  return <>{children}</>;
};
