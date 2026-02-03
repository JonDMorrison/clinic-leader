/**
 * Access Restricted View
 * 
 * Shown when a user attempts to access a master-admin-only route.
 * This is a security measure - even if someone guesses the route URL,
 * they cannot see any sensitive data.
 */

import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AccessRestrictedViewProps {
  /** Custom title for the restriction message */
  title?: string;
  /** Custom description for the restriction message */
  description?: string;
  /** Path to redirect back to */
  backTo?: string;
  /** Label for the back button */
  backLabel?: string;
}

export function AccessRestrictedView({
  title = "Access Restricted",
  description = "This area requires platform administrator privileges. If you believe you should have access, please contact your system administrator.",
  backTo = "/dashboard",
  backLabel = "Back to Dashboard",
}: AccessRestrictedViewProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <h2 className="text-xl font-semibold">{title}</h2>
          
          <p className="text-muted-foreground text-sm">
            {description}
          </p>
          
          <Link to={backTo}>
            <Button variant="outline" className="gap-2 mt-4">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
