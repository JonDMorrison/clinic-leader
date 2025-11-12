import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminAddUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: organizations, isLoading: orgsLoading } = useQuery({
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

  const { data: departments } = useQuery({
    queryKey: ["departments", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("organization_id", selectedOrgId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName || !selectedOrgId || !selectedRole) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-add-user", {
        body: {
          email,
          password,
          full_name: fullName,
          organization_id: selectedOrgId,
          role: selectedRole,
          department: selectedDepartment || null,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
        setSelectedRole("");
        setSelectedDepartment("");
      } else if (data.pending && data.signup_link) {
        toast.info("Sign-up link generated. Share with the user to complete account creation.", {
          description: data.signup_link,
          duration: 10000,
        });
      } else {
        throw new Error(data.error || "Failed to add user");
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error("Failed to add user", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrg = organizations?.find(org => org.id === selectedOrgId);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Add User to Organization
        </h1>
        <p className="text-muted-foreground">
          Create a new user and assign them to an organization (Superadmin only)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            User Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Select
                value={selectedOrgId}
                onValueChange={setSelectedOrgId}
                disabled={orgsLoading || isSubmitting}
              >
                <SelectTrigger id="organization">
                  <SelectValue placeholder="Choose an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedOrgId && departments && departments.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Choose a department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOrg && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  User will be added to:
                </p>
                <p className="text-lg font-bold text-foreground">{selectedOrg.name}</p>
                {selectedRole && (
                  <p className="text-sm text-muted-foreground mt-1">
                    with <span className="font-medium">{selectedRole}</span> role
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !selectedOrgId || !selectedRole}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isSubmitting ? "Adding User..." : "Add User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
