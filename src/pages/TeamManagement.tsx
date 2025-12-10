import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Pencil, Trash2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const VALID_ROLES = ["owner", "director", "manager", "provider", "staff", "billing"] as const;

const userSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(VALID_ROLES, { required_error: "Please select a role" }),
  department_ids: z.array(z.string().uuid()).min(1, "Select at least one department"),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function TeamManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: undefined,
      department_ids: [],
    },
  });

  // Use custom hook that properly handles impersonation
  const { data: currentUser } = useCurrentUser();

  // Fetch team members
  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["team-members", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          role,
          created_at,
          department_id,
          departments (name)
        `)
        .eq("team_id", currentUser.team_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const createUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (!currentUser?.team_id) throw new Error("No organization found");

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          full_name: values.full_name,
        },
      });

      if (authError) throw authError;

      // Insert user record - trigger will auto-sync to user_roles
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: values.email,
          full_name: values.full_name,
          role: values.role,
          team_id: currentUser.team_id,
          demo_user: false,
        });

      if (userError) throw userError;

      // Insert department assignments
      const departmentInserts = values.department_ids.map(deptId => ({
        user_id: authData.user.id,
        department_id: deptId,
      }));

      const { error: deptError } = await supabase
        .from("user_departments")
        .insert(departmentInserts);

      if (deptError) throw deptError;

      return authData.user;
    },
    onSuccess: () => {
      toast({
        title: "Team Member Added",
        description: "User has been created and can now log in.",
      });
      form.reset();
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: UserFormValues) => {
    createUserMutation.mutate(values);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
      case "director":
        return "default";
      case "manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isOwnerOrManager = currentUser?.role === "owner" || currentUser?.role === "manager";

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-brand bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's team members and their roles
          </p>
        </div>

        {isOwnerOrManager && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a new user account for your organization
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 6 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="provider">Provider</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departments</FormLabel>
                        <div className="space-y-2 border rounded-md p-3">
                          {departments?.map((dept) => (
                            <div key={dept.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={dept.id}
                                checked={field.value?.includes(dept.id)}
                                onChange={(e) => {
                                  const current = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...current, dept.id]);
                                  } else {
                                    field.onChange(current.filter((id) => id !== dept.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring cursor-pointer"
                              />
                              <Label htmlFor={dept.id} className="cursor-pointer">
                                {dept.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="glass">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              {isOwnerOrManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingMembers ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading team members...
                </TableCell>
              </TableRow>
            ) : teamMembers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No team members found
                </TableCell>
              </TableRow>
            ) : (
              teamMembers?.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.departments?.name || "—"}</TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  {isOwnerOrManager && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" disabled>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {!isOwnerOrManager && (
        <Card className="glass p-4 border-warning/50 bg-warning/5">
          <p className="text-sm text-muted-foreground">
            Only owners and managers can add or edit team members.
          </p>
        </Card>
      )}
    </div>
  );
}
