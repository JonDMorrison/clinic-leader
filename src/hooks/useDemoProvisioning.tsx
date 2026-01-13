import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to automatically provision demo organizations for whitelisted users
 * - Runs once per session using sessionStorage guard
 * - Avoids duplicate calls from auth state changes
 * - Reloads only on first-time provisioning (not when already provisioned)
 */
const STORAGE_KEY = "demoProvisionChecked_v1";

export function useDemoProvisioning() {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const runningRef = useRef(false);

  useEffect(() => {
    const checkAndProvision = async () => {
      if (hasChecked || isProvisioning || runningRef.current) return;

      // Skip entirely if we've already checked this session
      if (sessionStorage.getItem(STORAGE_KEY) === "true") {
        setHasChecked(true);
        return;
      }

      runningRef.current = true;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Wait for auth state change
          return;
        }

        // Whitelisted users only
        const whitelist = [
          'jonathanddmorrison@gmail.com',
          'jon@getclear.ca',
          'jonathandmorrison@gmail.com',
        ];

        if (!whitelist.includes(user.email || '')) {
          sessionStorage.setItem(STORAGE_KEY, "true");
          setHasChecked(true);
          return;
        }

        setIsProvisioning(true);
        console.log('Provisioning demo organization...');
        const { data, error } = await supabase.functions.invoke('demo-provision', {
          body: {},
        });

        if (error) {
          console.error('Demo provision error:', error);
          toast.error('Failed to set up demo organization');
          sessionStorage.setItem(STORAGE_KEY, "true");
          setHasChecked(true);
          return;
        }

        if (data?.success) {
          console.log('Demo provisioned successfully:', data);
          if (data.alreadyProvisioned) {
            // No reload needed if it already exists
            sessionStorage.setItem(STORAGE_KEY, "true");
            setHasChecked(true);
            return;
          }

          // First-time setup: refresh to ensure org context everywhere
          toast.success('Welcome! Your demo clinic has been set up.');
          sessionStorage.setItem(STORAGE_KEY, "true");
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } else {
          sessionStorage.setItem(STORAGE_KEY, "true");
          setHasChecked(true);
        }
      } catch (error) {
        console.error('Error in demo provisioning:', error);
        sessionStorage.setItem(STORAGE_KEY, "true");
        setHasChecked(true);
      } finally {
        runningRef.current = false;
        setIsProvisioning(false);
      }
    };

    // Initial check
    checkAndProvision();

    // Also react to sign-in events (e.g., arriving unauthenticated at first)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !sessionStorage.getItem(STORAGE_KEY)) {
        checkAndProvision();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasChecked, isProvisioning]);

  return { isProvisioning };
}

