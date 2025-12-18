import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users as UsersIcon, Settings, UserPlus } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { SeatTile } from "@/components/people/SeatTile";

import { PeopleAnalyzer } from "@/components/people/PeopleAnalyzer";
import { SeatManagementDialog } from "@/components/people/SeatManagementDialog";
import { SeatDetailModal } from "@/components/people/SeatDetailModal";
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
  department_ids: z.array(z.string().uuid()).min(1, "Select at least one department"),
  seat_id: z.string().uuid().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

const People = () => {
  const [seatManagementOpen, setSeatManagementOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [seatDetailOpen, setSeatDetailOpen] = useState(false);
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
      seat_id: undefined,
    },
  });
  
  const { data: currentUser } = useCurrentUser();

  const { data: seats, refetch: refetchSeats } = useQuery({
    queryKey: ["seats", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data, error } = await supabase
        .from("seats")
        .select(`
          *,
          users(full_name),
          seat_users(id, user_id, is_primary, users:user_id(id, full_name))
        `)
        .eq("organization_id", currentUser.team_id)
        .order("title");

      if (error) throw error;
      
      // Manually join reports_to_seat info
      const seatsWithReportsTo = data.map(seat => {
        const reportsToSeat = seat.reports_to_seat_id 
          ? data.find(s => s.id === seat.reports_to_seat_id)
          : null;
        return {
          ...seat,
          reports_to_seat: reportsToSeat ? { id: reportsToSeat.id, title: reportsToSeat.title } : null,
        };
      });
      
      return seatsWithReportsTo;
    },
    enabled: !!currentUser?.team_id,
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

      // Call the admin-add-user Edge Function
      const { data, error } = await supabase.functions.invoke('admin-add-user', {
        body: {
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          role: values.role,
          organization_id: currentUser.team_id,
          department: values.department_ids[0] || null, // Edge function takes single department
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to create user');
      }

      const userId = data.user_id;

      // Handle additional department assignments (if more than one department selected)
      if (values.department_ids.length > 1) {
        const additionalDepts = values.department_ids.slice(1); // Skip first one already assigned
        const departmentInserts = additionalDepts.map(deptId => ({
          user_id: userId,
          department_id: deptId,
        }));

        const { error: deptError } = await supabase
          .from("user_departments")
          .insert(departmentInserts);

        if (deptError) {
          console.error('Failed to assign additional departments:', deptError);
          // Don't throw, user is created, just log the error
        }
      }

      // Handle seat assignment
      if (values.seat_id) {
        const { error: seatError } = await supabase
          .from("seats")
          .update({ user_id: userId })
          .eq("id", values.seat_id);

        if (seatError) {
          console.error('Failed to assign seat:', seatError);
          // Don't throw, user is created, just log the error
        }
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Team Member Added",
        description: "User has been created and can now log in.",
      });
      form.reset();
      setIsAddUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["seats"] });
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

  // Filter unassigned seats for the dropdown
  const unassignedSeats = seats?.filter(seat => !seat.user_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          People
          <HelpHint term="People Analyzer" context="people_header" />
        </h1>
        <p className="text-muted-foreground">Accountability and core values</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
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

                          <FormField
                            control={form.control}
                            name="seat_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assign to Seat (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="No seat assignment" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {unassignedSeats?.map((seat) => (
                                      <SelectItem key={seat.id} value={seat.id}>
                                        {seat.title}
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
                    onClick={() => {
                      setSelectedSeat(seat);
                      setSeatDetailOpen(true);
                    }}
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
      </div>

      {/* Seat Management Dialog */}
      <SeatManagementDialog
        open={seatManagementOpen}
        onOpenChange={setSeatManagementOpen}
        seats={seats || []}
        onUpdate={refetchSeats}
        organizationId={currentUser?.team_id || null}
      />

      {/* Seat Detail Modal */}
      <SeatDetailModal
        seat={selectedSeat}
        users={users || []}
        allSeats={(seats || []).map(s => ({ id: s.id, title: s.title }))}
        open={seatDetailOpen}
        onOpenChange={setSeatDetailOpen}
        onUpdate={refetchSeats}
        isManager={isManager}
      />
    </div>
  );
};

export default People;
