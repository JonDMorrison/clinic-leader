import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationData {
  logId: string;
  targetUserId: string;
  targetEmail: string;
  targetFullName: string;
  originalAdminEmail: string;
}

export const useImpersonation = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);

  useEffect(() => {
    // Check if currently impersonating on mount
    const storedData = localStorage.getItem('impersonation_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setImpersonationData(data);
        setIsImpersonating(true);
      } catch (error) {
        console.error('Failed to parse impersonation data:', error);
        localStorage.removeItem('impersonation_data');
      }
    }
  }, []);

  const startImpersonation = (data: ImpersonationData) => {
    localStorage.setItem('impersonation_data', JSON.stringify(data));
    setImpersonationData(data);
    setIsImpersonating(true);
  };

  const exitImpersonation = async () => {
    if (!impersonationData) return;

    try {
      // Call edge function to end impersonation
      await supabase.functions.invoke('admin-impersonate', {
        body: {
          action: 'exit',
          logId: impersonationData.logId,
        },
      });
    } catch (error) {
      console.error('Failed to log impersonation exit:', error);
    }

    // Clear local data
    localStorage.removeItem('impersonation_data');
    setImpersonationData(null);
    setIsImpersonating(false);

    // Sign out and redirect to login
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return {
    isImpersonating,
    impersonationData,
    startImpersonation,
    exitImpersonation,
  };
};
