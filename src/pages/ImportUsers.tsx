import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const VALID_ROLES = ["owner", "director", "manager", "provider", "staff", "billing"] as const;

const userSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be less than 72 characters"),
  role: z.enum(VALID_ROLES, { required_error: "Please select a role" }),
  department_id: z.string().uuid("Please select a department"),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function ImportUsers() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Use custom hook that properly handles impersonation
  const { data: currentUser } = useCurrentUser();

  // Fetch departments for the organization
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

      // Insert user record
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
        title: "User Created",
        description: "User has been successfully created and can now log in.",
      });
      form.reset();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Import logic will be implemented when ready
      toast({
        title: "Import Ready",
        description: "User import functionality will be activated once the staff list is finalized.",
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: "Failed to process user import",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          Import Users
        </h1>
        <p className="text-muted-foreground">
          Add users manually or upload a CSV file to bulk import
        </p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">
            <UserPlus className="h-4 w-4 mr-2" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="csv">
            <Upload className="h-4 w-4 mr-2" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card className="glass p-6">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
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
                        <Input type="email" placeholder="john.doe@northwest.com" {...field} />
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
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <Alert className="mb-6 glass border-warning/50 bg-warning/5">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription>
              CSV bulk import will be activated once needed. Use manual entry for now.
            </AlertDescription>
          </Alert>

          <Card className="glass p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">CSV Format Requirements</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your CSV file should include the following columns:
                </p>
                <div className="bg-surface/50 p-4 rounded-lg font-mono text-sm">
                  email, full_name, role, department
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Valid roles: owner, director, manager, provider, staff, billing
                </p>
                <p className="text-xs text-muted-foreground">
                  Valid departments: Front Desk, Clinical – Chiropractic, Clinical –
                  Mid-Level, Massage, Billing, Management
                </p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-brand/50 transition-colors">
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {file ? file.name : "Click to upload CSV"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop
                    </p>
                  </div>
                </label>
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Import Users (Disabled)"}
              </Button>
            </div>
          </Card>

          <Card className="glass p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Example CSV</h3>
            <pre className="bg-surface/50 p-4 rounded-lg text-xs overflow-x-auto">
{`email,full_name,role,department
john.doe@northwest.com,John Doe,director,Management
jane.smith@northwest.com,Jane Smith,provider,Clinical – Chiropractic
admin@northwest.com,Admin User,owner,Management`}
            </pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
