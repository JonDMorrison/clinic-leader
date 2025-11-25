import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users as UsersIcon, Settings, UserPlus } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { SeatTile } from "@/components/people/SeatTile";
import { ValuesList } from "@/components/people/ValuesList";
import { PeopleAnalyzer } from "@/components/people/PeopleAnalyzer";
import { SeatManagementDialog } from "@/components/people/SeatManagementDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
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
  department_id: z.string().uuid("Please select a department"),
});

type UserFormValues = z.infer<typeof userSchema>;

const People = () => {
  const [seatManagementOpen, setSeatManagementOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: undefined,
      department_id: "",
    },
  });
  
  const { data: currentUser } = useCurrentUser();

  const { data: seats, refetch: refetchSeats } = useQuery({
    queryKey: ["seats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("*, users(full_name)")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("team_id", currentUser?.team_id)
        .order("full_name")
        .limit(1000); // Ensure we fetch all users

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: coreValues } = useQuery({
    queryKey: ["core-values"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_values")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: valueRatings, refetch: refetchRatings } = useQuery({
    queryKey: ["value-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("value_ratings")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });

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

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          full_name: values.full_name,
        },
      });

      if (authError) throw authError;

      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: values.email,
          full_name: values.full_name,
          role: values.role,
          team_id: currentUser.team_id,
          department_id: values.department_id,
          demo_user: false,
        });

      if (userError) throw userError;

      return authData.user;
    },
    onSuccess: () => {
      toast({
        title: "Team Member Added",
        description: "User has been created and can now log in.",
      });
      form.reset();
      setIsAddUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
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

  const isManager =
    currentUser?.role === "manager" ||
    currentUser?.role === "director" ||
    currentUser?.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          People
          <HelpHint term="People Analyzer" context="people_header" />
        </h1>
        <p className="text-muted-foreground">Accountability and core values</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Seats</h2>
              {isManager && (
                <div className="flex gap-2">
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
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
                            name="department_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {departments?.map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSeatManagementOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Seats
                  </Button>
                </div>
              )}
            </div>
            {seats && seats.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {seats.map((seat) => (
                  <SeatTile
                    key={seat.id}
                    seat={seat}
                    users={users || []}
                    onUpdate={refetchSeats}
                    isManager={isManager}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<UsersIcon className="w-12 h-12" />}
                title="No seats defined"
                description="Contact your administrator to set up organizational seats."
              />
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              People Analyzer
              <HelpHint term="People Analyzer" context="people_analyzer_section" size="sm" />
            </h2>
            <PeopleAnalyzer
              users={users || []}
              coreValues={coreValues || []}
              valueRatings={valueRatings || []}
              onUpdate={() => {
                refetchRatings();
                refetchUsers();
              }}
              isManager={isManager}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <ValuesList values={coreValues || []} />
        </div>
      </div>

      {/* Seat Management Dialog */}
      <SeatManagementDialog
        open={seatManagementOpen}
        onOpenChange={setSeatManagementOpen}
        seats={seats || []}
        onUpdate={refetchSeats}
        organizationId={currentUser?.team_id || null}
      />
    </div>
  );
};

export default People;
