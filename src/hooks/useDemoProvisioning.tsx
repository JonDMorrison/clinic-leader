import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to automatically provision demo organizations for whitelisted users
 */
export function useDemoProvisioning() {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkAndProvision = async () => {
      // Only check once per session
      if (hasChecked) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user is whitelisted for demo
        const whitelist = [
          'jonathanddmorrison@gmail.com',
          'jon@getclear.ca',
        ];

        if (!whitelist.includes(user.email || '')) {
          setHasChecked(true);
          return;
        }

        // Check if already provisioned
        const { data: existing } = await supabase
          .from('demo_provision')
          .select('id, team_id')
          .eq('user_id', user.id)
          .single();

        if (existing) {
          console.log('Demo already provisioned for user');
          setHasChecked(true);
          return;
        }

        // Provision demo
        setIsProvisioning(true);
        console.log('Provisioning demo organization...');

        const { data, error } = await supabase.functions.invoke('demo-provision', {
          body: {},
        });

        if (error) {
          console.error('Demo provision error:', error);
          toast.error('Failed to set up demo organization');
        } else if (data?.success) {
          console.log('Demo provisioned successfully:', data);
          toast.success('Welcome! Your demo clinic has been set up.');
          
          // Reload to apply new team membership
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        console.error('Error in demo provisioning:', error);
      } finally {
        setIsProvisioning(false);
        setHasChecked(true);
      }
    };

    // Check on mount and when auth state changes
    checkAndProvision();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !hasChecked) {
        checkAndProvision();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasChecked]);

  return { isProvisioning };
}
