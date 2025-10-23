import { useState } from "react";
import { HelpCircle, Play, Mail, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { userTourService } from "@/lib/userTourService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const HelpMenu = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRelaunchTour = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const success = await userTourService.relaunchTour(user.id);
      if (success) {
        toast.success("Reloading tour...");
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error("Failed to restart tour");
      }
    }
    setIsLoading(false);
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@eosclinic.com?subject=Support Request";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full glass-dark hover:glow-brand transition-all duration-300"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-dark border-white/20">
        <DropdownMenuItem
          onClick={handleRelaunchTour}
          disabled={isLoading}
          className="cursor-pointer hover:bg-white/10 rounded-xl transition-colors"
        >
          <Play className="w-4 h-4 mr-2" />
          Take the Tour Again
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleContactSupport}
          className="cursor-pointer hover:bg-white/10 rounded-xl transition-colors"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contact Support
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className="cursor-not-allowed opacity-50 rounded-xl"
        >
          <Video className="w-4 h-4 mr-2" />
          View Training Videos
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
