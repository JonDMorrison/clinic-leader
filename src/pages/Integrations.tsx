import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, ArrowRight, Clock, CheckCircle2, Zap, Database, CreditCard, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpHint } from "@/components/help/HelpHint";
import { useOrgDataSourceStatus } from "@/hooks/useOrgDataSourceStatus";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon" | "connected";
  category: "Practice Management" | "Payments" | "Communication" | "Analytics" | "Bulk Analytics";
  path?: string;
  features: string[];
}

const integrations: Integration[] = [
  {
    id: "jane",
    name: "Jane App",
    description: "Connect your Jane clinic to automatically update your scorecards with daily data",
    icon: <Cloud className="w-8 h-8" />,
    status: "available",
    category: "Practice Management",
    path: "/settings/integrations/jane",
    features: [
      "Automatic daily data delivery",
      "No credentials or login required",
      "Appointment & financial metrics",
      "Guided setup wizard",
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept online payments and track revenue metrics",
    icon: <CreditCard className="w-8 h-8" />,
    status: "coming-soon",
    category: "Payments",
    features: [
      "Payment processing",
      "Revenue tracking",
      "Customer management",
      "Automated reconciliation",
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync financial data and automate bookkeeping",
    icon: <Database className="w-8 h-8" />,
    status: "coming-soon",
    category: "Practice Management",
    features: [
      "Financial sync",
      "Expense tracking",
      "Invoice management",
      "Tax reporting",
    ],
  },
];

const categories = ["All", "Practice Management", "Payments", "Analytics"] as const;

export default function Integrations() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = React.useState<typeof categories[number]>("All");
  
  // Get data source status to show dynamic Jane status
  const dataSourceStatus = useOrgDataSourceStatus();

  const filteredIntegrations = integrations.filter(
    (integration) =>
      selectedCategory === "All" || integration.category === selectedCategory
  );
  
  // Determine Jane integration status dynamically
  const getJaneStatus = (): Integration["status"] => {
    if (dataSourceStatus.isLoading) return "available";
    if (dataSourceStatus.mode === "jane") {
      if (dataSourceStatus.janeConnectionStatus === "active") return "connected";
    }
    return "available";
  };

  const getStatusBadge = (integration: Integration) => {
    // Use dynamic status for Jane
    const status = integration.id === "jane" ? getJaneStatus() : integration.status;
    
    // Show flow status for connected Jane
    if (integration.id === "jane" && status === "connected") {
      const flowConfig = {
        flowing: { icon: CheckCircle2, label: "Data Flowing", className: "bg-success/10 text-success border-success/20" },
        connected_waiting: { icon: Clock, label: "Waiting for Data", className: "bg-warning/10 text-warning border-warning/20" },
        error: { icon: AlertCircle, label: "Error", className: "bg-destructive/10 text-destructive border-destructive/20" },
      }[dataSourceStatus.flowStatus] || { icon: CheckCircle2, label: "Connected", className: "bg-success/10 text-success border-success/20" };
      
      return (
        <Badge className={flowConfig.className}>
          <flowConfig.icon className="w-3 h-3 mr-1" />
          {flowConfig.label}
        </Badge>
      );
    }
    
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "available":
        return (
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case "coming-soon":
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Coming Soon
          </Badge>
        );
    }
  };

  const handleIntegrationClick = (integration: Integration) => {
    // Use dynamic status for Jane
    const status = integration.id === "jane" ? getJaneStatus() : integration.status;
    if ((status === "available" || status === "connected") && integration.path) {
      navigate(integration.path);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center">
          Integrations
          <HelpHint term="Integrations" context="integrations_header" />
        </h1>
        <p className="text-muted-foreground">
          Connect your practice management tools and automate your workflows
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredIntegrations.map((integration) => {
          // Compute dynamic status for Jane
          const effectiveStatus = integration.id === "jane" ? getJaneStatus() : integration.status;
          const isClickable = effectiveStatus === "available" || effectiveStatus === "connected";
          
          return (
            <Card
              key={integration.id}
              className={cn(
                "bg-background/95 backdrop-blur-xl border-border/20 transition-all hover:shadow-lg",
                isClickable && "cursor-pointer hover:border-primary/50"
              )}
              onClick={() => handleIntegrationClick(integration)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    {integration.icon}
                  </div>
                  {getStatusBadge(integration)}
                </div>
                <CardTitle className="flex items-center justify-between">
                  {integration.name}
                </CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Key Features:</p>
                    <ul className="space-y-1">
                      {integration.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-center gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isClickable && integration.path && (
                    <Button
                      className="w-full"
                      variant={effectiveStatus === "connected" ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(integration.path!);
                      }}
                    >
                      {effectiveStatus === "connected" ? "Manage" : "Configure"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {integration.status === "coming-soon" && (
                    <Button className="w-full" variant="outline" disabled>
                      Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Request Integration */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-primary/10">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Need a specific integration?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let us know which tools you'd like to connect with ClinicLeader
              </p>
              <Button variant="outline">Request Integration</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
