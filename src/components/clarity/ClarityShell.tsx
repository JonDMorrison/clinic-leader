import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Save, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ClarityShellProps {
  children: ReactNode;
  organizationId: string;
  vtoId?: string;
  versionCurrent?: number;
  versionStatus?: 'draft' | 'published';
  autosaveStatus?: 'saved' | 'saving' | 'error';
  miniMapSections?: {
    id: string;
    label: string;
    complete: boolean;
    href: string;
  }[];
  onAICoachOpen?: () => void;
}

export function ClarityShell({
  children,
  organizationId,
  vtoId,
  versionCurrent = 1,
  versionStatus = 'draft',
  autosaveStatus = 'saved',
  miniMapSections = [],
  onAICoachOpen
}: ClarityShellProps) {
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const [showCoach, setShowCoach] = useState(false);

  const userRole = user?.role || 'staff';

  // Auto-hide coach rail on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowCoach(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/clarity" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold hidden sm:inline">Clinic Clarity</span>
            </Link>
            
            {vtoId && (
              <div className="flex items-center gap-2">
                <Badge variant={versionStatus === 'published' ? 'default' : 'secondary'}>
                  V{versionCurrent} {versionStatus === 'draft' ? 'Draft' : ''}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {autosaveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              )}
              {autosaveStatus === 'saving' && (
                <>
                  <Clock className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              )}
              {autosaveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="hidden sm:inline">Error</span>
                </>
              )}
            </div>

            <Button asChild variant="default" size="sm">
              <Link to="/clarity/review">
                <ListChecks className="h-4 w-4 mr-2" />
                Review
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCoach(true);
                onAICoachOpen?.();
              }}
              className="lg:hidden"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Mini-Map */}
        {miniMapSections.length > 0 && (
          <aside className="hidden md:flex w-64 border-r bg-muted/10">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  Progress
                </h3>
                {miniMapSections.map((section) => {
                  const isActive = location.pathname === section.href || 
                                   location.hash === `#${section.id}`;
                  
                  return (
                    <Link
                      key={section.id}
                      to={section.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      {section.complete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{section.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl py-6">
            {children}
          </div>
        </main>

        {/* Right AI Coach Rail - Desktop */}
        <aside className="hidden lg:flex w-80 border-l bg-muted/10">
          <AICoachRail userRole={userRole} vtoId={vtoId} />
        </aside>

        {/* Right AI Coach Rail - Mobile Sheet */}
        <Sheet open={showCoach} onOpenChange={setShowCoach}>
          <SheetContent side="right" className="w-full sm:w-96">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Coach
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <AICoachRail userRole={userRole} vtoId={vtoId} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

interface AICoachRailProps {
  userRole: string;
  vtoId?: string;
}

function AICoachRail({ userRole, vtoId }: AICoachRailProps) {
  const roleChips = getRolePrompts(userRole);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Role Badge */}
        <div>
          <Badge variant="outline" className="mb-3">
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </Badge>
          <p className="text-sm text-muted-foreground">
            AI suggestions tailored to your role
          </p>
        </div>

        {/* Quick Prompts */}
        <div>
          <h3 className="font-semibold text-sm mb-3">Quick Prompts</h3>
          <div className="space-y-2">
            {roleChips.map((prompt, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-auto py-2 px-3"
                disabled={!vtoId}
              >
                <Sparkles className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-xs">{prompt}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* AI Actions */}
        <div>
          <h3 className="font-semibold text-sm mb-3">AI Actions</h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" disabled={!vtoId}>
              <Sparkles className="h-4 w-4 mr-2" />
              Draft 3 Versions
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" disabled={!vtoId}>
              <Sparkles className="h-4 w-4 mr-2" />
              Tighten Language
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" disabled={!vtoId}>
              <Sparkles className="h-4 w-4 mr-2" />
              Make Measurable
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" disabled={!vtoId}>
              <Sparkles className="h-4 w-4 mr-2" />
              Spot Gaps vs KPIs
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> AI suggestions are based on your vision and traction data. 
            The more complete your inputs, the better the recommendations.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

function getRolePrompts(role: string): string[] {
  const prompts: Record<string, string[]> = {
    owner: [
      "Progress toward 1-Year Plan?",
      "What's off-track for this quarter?",
      "Which Rocks affect our red KPIs?"
    ],
    director: [
      "Progress toward 1-Year Plan?",
      "What's off-track for this quarter?",
      "Which Rocks affect our red KPIs?"
    ],
    manager: [
      "Team progress on quarterly rocks?",
      "Which KPIs support our goals?"
    ],
    staff: [
      "How can I contribute to our goals?",
      "What priorities are most urgent?"
    ]
  };

  return prompts[role] || prompts.staff;
}
