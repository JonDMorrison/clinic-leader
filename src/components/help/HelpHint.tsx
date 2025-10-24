import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpModal } from "./HelpModal";
import { GLOSSARY } from "@/lib/help/glossary";
import { cn } from "@/lib/utils";

interface HelpHintProps {
  term: string;
  context?: string;
  size?: 'sm' | 'md';
  forceShow?: boolean;
  className?: string;
}

export const HelpHint = ({ 
  term, 
  context, 
  size = 'sm', 
  forceShow = false,
  className 
}: HelpHintProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if user has dismissed this hint
  const { data: isDismissed } = useQuery({
    queryKey: ['help-dismissed', term],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!userData) return false;

      const { data } = await supabase
        .from('help_dismissed')
        .select('dismissed')
        .eq('user_id', userData.id)
        .eq('term', term)
        .maybeSingle();

      return data?.dismissed || false;
    },
  });

  const glossaryEntry = GLOSSARY[term];

  if (!glossaryEntry) return null;
  if (isDismissed && !forceShow) return null;

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              aria-label={`Help: ${term}`}
              className={cn(
                "inline-flex items-center justify-center rounded-full",
                "text-muted-foreground hover:text-brand transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                "ml-1.5",
                className
              )}
            >
              <HelpCircle className={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
          >
            {glossaryEntry.short}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isModalOpen && (
        <HelpModal
          term={term}
          context={context}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
