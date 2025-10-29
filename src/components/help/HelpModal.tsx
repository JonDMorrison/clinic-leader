import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GLOSSARY } from "@/lib/help/glossary";
import { ROLE_TIPS, UserRole } from "@/lib/help/roles";
import { toast } from "sonner";

interface HelpModalProps {
  term: string;
  context?: string;
  onClose: () => void;
}

export const HelpModal = ({ term, context, onClose }: HelpModalProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const glossaryEntry = GLOSSARY[term];
  const roleTips = ROLE_TIPS[term];

  // Get current user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const { data: userData } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('id', user.id)
        .single();

      return { ...userData, role: roleData?.role || 'staff' };
    },
  });

  // Log view event
  useEffect(() => {
    const logView = async () => {
      if (!userRole) return;

      await supabase.from('help_events').insert({
        team_id: userRole.team_id,
        user_id: userRole.id,
        term,
        action: 'view',
        context: context || null,
      });
    };

    logView();
  }, [term, context, userRole]);

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!userRole) throw new Error('User not found');

      await supabase.from('help_dismissed').upsert({
        team_id: userRole.team_id,
        user_id: userRole.id,
        term,
        dismissed: true,
      });

      await supabase.from('help_events').insert({
        team_id: userRole.team_id,
        user_id: userRole.id,
        term,
        action: 'dismiss',
        context: context || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-dismissed', term] });
      toast.success("Got it! This hint won't show again.");
      onClose();
    },
  });

  const handleLearnMore = async () => {
    if (!glossaryEntry.learnMore || !userRole) return;

    await supabase.from('help_events').insert({
      team_id: userRole.team_id,
      user_id: userRole.id,
      term,
      action: 'open_docs',
      context: context || null,
    });

    navigate(glossaryEntry.learnMore.href);
    onClose();
  };

  // Keyboard handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!glossaryEntry) return null;

  const currentRole = userRole?.role as UserRole;
  const hasRoleTips = roleTips && Object.keys(roleTips).length > 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-background/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="help-modal-title"
        aria-modal="true"
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-transparent to-accent/20 pointer-events-none rounded-3xl" />
        
        <div className="relative p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h2 
              id="help-modal-title"
              className="text-2xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent"
            >
              {term}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-white/10"
              aria-label="Close help"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Definition */}
          <div className="mb-6">
            <p className="text-foreground leading-relaxed">
              {glossaryEntry.definition}
            </p>
          </div>

          {/* Why it matters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Why it matters
            </h3>
            <ul className="space-y-2">
              {glossaryEntry.why.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-brand mt-0.5">•</span>
                  <span className="text-foreground/90">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Role-specific tips */}
          {hasRoleTips && (
            <div className="mb-6">
              <Tabs defaultValue={currentRole || 'staff'} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                  {Object.keys(roleTips).map((role) => (
                    <TabsTrigger key={role} value={role} className="capitalize whitespace-nowrap">
                      {role.replace('_', ' ')}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(roleTips).map(([role, tips]) => (
                  <TabsContent key={role} value={role} className="mt-4">
                    <div className="rounded-2xl bg-brand/5 border border-brand/10 p-4">
                      <h4 className="text-sm font-semibold text-brand mb-3 capitalize">
                        Tips for {role.replace('_', ' ')}
                      </h4>
                      <ul className="space-y-2">
                        {tips?.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-brand mt-0.5">→</span>
                            <span className="text-foreground/90">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {glossaryEntry.learnMore && (
              <Button
                onClick={handleLearnMore}
                className="bg-gradient-to-r from-brand to-accent hover:opacity-90 gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {glossaryEntry.learnMore.label}
              </Button>
            )}
            <Button
              onClick={() => dismissMutation.mutate()}
              variant="outline"
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending ? "Saving..." : "Don't show again"}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="sm:ml-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
