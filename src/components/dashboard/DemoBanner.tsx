import { useState, useEffect } from "react";
import { getStorage, setStorage } from "@/lib/storage/versionedStorage";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const STORAGE_KEY = "demo-banner-dismissed";

export const DemoBanner = () => {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
  const { data: currentUser } = useCurrentUser();

  // Check if this is a demo org
  const { data: isDemo, isLoading } = useQuery({
    queryKey: ["is-demo-org", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return false;
      
      const { data, error } = await supabase
        .from("teams")
        .select("is_demo_org")
        .eq("id", currentUser.team_id)
        .single();
      
      if (error) return false;
      return data?.is_demo_org === true;
    },
    enabled: !!currentUser?.team_id,
  });

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = getStorage<boolean>(STORAGE_KEY);
    setIsDismissed(dismissed === true);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setStorage(STORAGE_KEY, true);
  };

  // Don't render if loading, dismissed, or not a demo org
  if (isLoading || isDismissed || !isDemo) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50 text-sm"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-brand flex-shrink-0" />
          <span>You're viewing a demo account with simulated data.</span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss demo notice"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
