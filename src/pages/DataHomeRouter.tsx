import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useActiveConnectors } from "@/hooks/useActiveConnectors";
import { Loader2 } from "lucide-react";
import DataJaneHome from "./DataJaneHome";
import DataDefaultHome from "./DataDefaultHome";

export default function DataHomeRouter() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { hasActiveConnector, isLoading: connectorsLoading } = useActiveConnectors();

  // Loading state
  if (userLoading || connectorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  // Route based on active connector (replaces teams.data_mode === 'jane')
  if (hasActiveConnector("jane")) {
    return <DataJaneHome />;
  }

  // Default mode (includes manual, spreadsheet, and any fallback)
  return <DataDefaultHome />;
}
