import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/hooks/useImpersonation";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_id: string;
  teams: { name: string } | null;
}

const AdminImpersonate = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();

  // Fetch current user to verify admin status
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();
      
      return data;
    },
  });

  // Fetch all users with their organizations
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          team_id,
          teams:team_id (name)
        `)
        .order('email');

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as User[];
    },
  });

  const handleImpersonate = async (user: User) => {
    try {
      // Get current session to pass as admin token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call edge function to generate impersonation session
      const { data, error } = await supabase.functions.invoke('admin-impersonate', {
        body: {
          targetUserId: user.id,
          action: 'start',
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to start impersonation');
      }

      // Store original admin session info
      const adminEmail = currentUser?.email || session.user.email;
      
      // Store impersonation data
      startImpersonation({
        logId: data.logId,
        targetUserId: user.id,
        targetEmail: user.email,
        targetFullName: user.full_name,
        originalAdminEmail: adminEmail,
      });

      toast({
        title: "Impersonation Started",
        description: `Now viewing as ${user.email}`,
      });

      // Navigate to the session URL to establish the session
      window.location.href = data.sessionUrl;

    } catch (error: any) {
      console.error('Impersonation error:', error);
      toast({
        title: "Impersonation Failed",
        description: error.message || "Failed to impersonate user",
        variant: "destructive",
      });
    }
  };

  // Check if user can access this page (master admin only)
  const masterAdminEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
  if (currentUser && currentUser.email !== masterAdminEmail) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-6 w-6" />
            Admin User Impersonation
          </CardTitle>
          <CardDescription>
            Login as any user to view their account and provide support. All actions are logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-2">
              {users?.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.email}</p>
                        {user.full_name && (
                          <span className="text-sm text-muted-foreground">
                            ({user.full_name})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <span>Role: {user.role}</span>
                        {user.teams && <span>Org: {user.teams.name}</span>}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleImpersonate(user)}
                      variant="outline"
                      size="sm"
                    >
                      <UserCircle className="h-4 w-4 mr-2" />
                      Impersonate
                    </Button>
                  </div>
                </Card>
              ))}
              {users?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImpersonate;
