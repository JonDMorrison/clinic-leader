import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CompanyWizard } from "@/components/onboarding/CompanyWizard";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [userMeta, setUserMeta] = useState<{ clinic_name?: string; emr_system?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        // Refresh session to ensure it's valid
        await supabase.auth.refreshSession();

        // Get user's team and onboarding status
        const { data: userData } = await supabase
          .from("users")
          .select("team_id, teams(onboarding_status)")
          .eq("id", user.id)
          .single();

        if (!userData?.team_id) {
          // Create organization shell if none exists
          const { data: newTeam } = await supabase
            .from("teams")
            .insert({ name: "New Organization", onboarding_status: "draft" })
            .select()
            .single();

          if (newTeam) {
            await supabase
              .from("users")
              .update({ team_id: newTeam.id })
              .eq("id", user.id);

            setOrganizationId(newTeam.id);
          }
        } else {
          const teamData = userData.teams as any;
          
          // If already completed, redirect to dashboard
          if (teamData?.onboarding_status === "completed") {
            navigate("/dashboard");
            return;
          }

          setOrganizationId(userData.team_id);
        }

        setUserId(user.id);
        setUserEmail(user.email || "");

        // Pre-fill from user metadata if available
        const meta = user.user_metadata || {};
        if (meta.clinic_name || meta.emr_system) {
          setUserMeta({ clinic_name: meta.clinic_name, emr_system: meta.emr_system });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CompanyWizard
      userId={userId}
      userEmail={userEmail}
      organizationId={organizationId}
      userMeta={userMeta}
    />
  );
}
