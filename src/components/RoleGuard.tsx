import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";

type UserRole = 'owner' | 'director' | 'manager' | 'provider' | 'staff' | 'billing';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAdmin?: boolean; // Convenience flag for (owner | director)
}

/**
 * RoleGuard protects frontend routes.
 * It uses useCurrentUser which is impersonation-aware.
 */
export const RoleGuard = ({ children, allowedRoles, requireAdmin = false }: RoleGuardProps) => {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const userRole = user.role as UserRole;

  // Check Admin (Owner/Director)
  if (requireAdmin && !['owner', 'director'].includes(userRole)) {
    console.warn(`[RoleGuard] User ${user.email} (role: ${userRole}) denied admin access.`);
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`[RoleGuard] User ${user.email} (role: ${userRole}) denied access. Required: ${allowedRoles.join(',')}`);
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
