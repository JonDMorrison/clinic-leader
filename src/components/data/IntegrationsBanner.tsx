import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CalendarClock,
  Stethoscope,
  DollarSign,
  Users,
  FileText,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

interface IntegrationsBannerProps {
  isConnected: boolean;
}

const INTEGRATIONS = [
  { 
    name: "Jane App", 
    icon: CalendarClock, 
    status: "available" as const,
    description: "Appointments, revenue, and patient metrics",
    path: "/integrations/jane"
  },
  { 
    name: "Cliniko", 
    icon: Stethoscope, 
    status: "coming_soon" as const,
    description: "Practice management data"
  },
  { 
    name: "QuickBooks", 
    icon: DollarSign, 
    status: "coming_soon" as const,
    description: "Financial and accounting data"
  },
  { 
    name: "Gusto", 
    icon: Users, 
    status: "coming_soon" as const,
    description: "Payroll and HR data"
  },
  { 
    name: "Excel/CSV", 
    icon: FileText, 
    status: "coming_soon" as const,
    description: "Import spreadsheet data"
  },
];

export function IntegrationsBanner({ isConnected }: IntegrationsBannerProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Only show banner if not connected or as collapsed section when connected
  const availableCount = INTEGRATIONS.filter(i => i.status === "available").length;
  const comingSoonCount = INTEGRATIONS.filter(i => i.status === "coming_soon").length;

  if (isConnected) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Available Integrations ({availableCount + comingSoonCount})
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {INTEGRATIONS.map((integration) => (
              <Card 
                key={integration.name} 
                className={`${integration.status === "available" ? "hover:border-brand/50 cursor-pointer" : "opacity-60"} transition-colors`}
                onClick={() => integration.path && navigate(integration.path)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <integration.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{integration.name}</span>
                    <Badge variant={integration.status === "available" ? "default" : "outline"} className="text-xs">
                      {integration.status === "available" ? "Connected" : "Soon"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Not connected - show prominent banner
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold mb-1">Connect an Integration</h3>
            <p className="text-sm text-muted-foreground">
              Automate your data flow by connecting your practice management tools
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {INTEGRATIONS.map((integration) => (
              <Card 
                key={integration.name} 
                className={`${integration.status === "available" ? "hover:border-brand/50 cursor-pointer group" : "opacity-60 border-dashed"} transition-colors`}
                onClick={() => integration.path && navigate(integration.path)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <integration.icon className={`w-5 h-5 ${integration.status === "available" ? "text-brand" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{integration.name}</span>
                    <Badge variant={integration.status === "available" ? "default" : "outline"} className="text-xs">
                      {integration.status === "available" ? "Available" : "Soon"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button onClick={() => navigate("/integrations/jane")} className="gap-2">
              Get Started with Jane
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
