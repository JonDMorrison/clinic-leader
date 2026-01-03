import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, ArrowRight, Clock, CheckCircle2, Zap, Database, CreditCard, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpHint } from "@/components/help/HelpHint";

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

  const filteredIntegrations = integrations.filter(
    (integration) =>
      selectedCategory === "All" || integration.category === selectedCategory
  );

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
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
    if (integration.status === "available" && integration.path) {
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
        {filteredIntegrations.map((integration) => (
          <Card
            key={integration.id}
            className={cn(
              "bg-background/95 backdrop-blur-xl border-border/20 transition-all hover:shadow-lg",
              integration.status === "available" && "cursor-pointer hover:border-primary/50"
            )}
            onClick={() => handleIntegrationClick(integration)}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  {integration.icon}
                </div>
                {getStatusBadge(integration.status)}
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
                {integration.status === "available" && integration.path && (
                  <Button
                    className="w-full"
                    onClick={() => navigate(integration.path!)}
                  >
                    Configure
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
        ))}
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
