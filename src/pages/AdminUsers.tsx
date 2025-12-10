import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, UserCog, Search, Filter, UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UserWithDetails {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  team_id: string;
  team_name: string;
  role: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users with organization and role info
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users", search, orgFilter, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          department,
          team_id,
          teams:team_id(name),
          user_roles(role)
        `);

      if (orgFilter !== "all") {
        query = query.eq("team_id", orgFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result: UserWithDetails[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        department: user.department,
        team_id: user.team_id,
        team_name: user.teams?.name || "No Organization",
        role: user.user_roles?.[0]?.role || "staff",
      }));

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(
          (u) =>
            u.email.toLowerCase().includes(searchLower) ||
            u.full_name.toLowerCase().includes(searchLower)
        );
      }

      // Apply role filter
      if (roleFilter !== "all") {
        result = result.filter((u) => u.role === roleFilter);
      }

      return result;
    },
  });

  // Fetch organizations for filter
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      // Delete from user_roles first
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .in("user_id", userIds);
      if (rolesError) throw rolesError;

      // Delete from users table
      const { error: usersError } = await supabase
        .from("users")
        .delete()
        .in("id", userIds);
      if (usersError) throw usersError;

      // Note: Auth users remain in auth.users but can't access anything without users table entry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      toast.success(`Deleted ${selectedUsers.size} user(s)`);
      setSelectedUsers(new Set());
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error("Failed to delete users: " + error.message);
    },
  });

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    deleteMutation.mutate(Array.from(selectedUsers));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "director":
        return "secondary";
      case "manager":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users across all organizations
          </p>
        </div>
        <Button onClick={() => navigate("/admin/add-user")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <UserCog className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedUsers.size} user(s) selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          users.length > 0 &&
                          selectedUsers.size === users.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.full_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.team_name}</TableCell>
                      <TableCell>{user.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Showing {users.length} user(s)
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUsers.size} user(s)? This
              will remove them from the users table and revoke their access. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
