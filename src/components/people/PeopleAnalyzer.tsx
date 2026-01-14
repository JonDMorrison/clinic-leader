import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PersonDetailModal } from "./PersonDetailModal";
import { UserMetricsBadge } from "./UserMetricsBadge";
import { useUsersMetrics } from "@/hooks/useUserMetrics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

interface CoreValue {
  id: string;
  name: string;
  description: string | null;
}

interface ValueRating {
  id: string;
  user_id: string;
  value_id: string;
  rating: "+" | "±" | "-";
  notes: string | null;
}

interface PeopleAnalyzerProps {
  users: User[];
  coreValues: CoreValue[];
  valueRatings: ValueRating[];
  isManager: boolean;
  onUpdate: () => void;
  /** Optional: auto-open the modal for this user (deep link support) */
  initialUserId?: string | null;
  /** Callback when initial user handling is complete */
  onInitialUserHandled?: () => void;
}

export function PeopleAnalyzer({ 
  users, 
  coreValues, 
  valueRatings, 
  isManager, 
  onUpdate,
  initialUserId,
  onInitialUserHandled,
}: PeopleAnalyzerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const handledUserIdRef = useRef<string | null>(null);
  
  // Fetch metrics for all users in bulk
  const userIds = users.map((u) => u.id);
  const { metricsMap } = useUsersMetrics(userIds, currentUser?.team_id);

  // Handle initial user deep link - reacts to URL param changes
  useEffect(() => {
    // Skip if no initialUserId or users haven't loaded yet
    if (!initialUserId || users.length === 0) return;
    
    // Skip if we've already handled this exact userId
    if (handledUserIdRef.current === initialUserId) return;
    
    // Mark as handled
    handledUserIdRef.current = initialUserId;
    
    // Verify the user exists in the org's user list
    const userExists = users.some((u) => u.id === initialUserId);
    
    if (userExists) {
      setSelectedUserId(initialUserId);
      setIsModalOpen(true);
    } else {
      // User not found in this org - show toast
      toast.error("Person not found", {
        description: "The requested team member could not be found in your organization.",
      });
    }
    
    // Notify parent that we've handled the initial user
    onInitialUserHandled?.();
  }, [initialUserId, users, onInitialUserHandled]);

  // Reset handled ref when initialUserId changes to a new value (allows re-navigation)
  useEffect(() => {
    if (initialUserId !== handledUserIdRef.current) {
      handledUserIdRef.current = null;
    }
  }, [initialUserId]);

  const handleOpenModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {users.map((user) => {
              const metrics = metricsMap.get(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => handleOpenModal(user.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md"
                >
                  <UserAvatar user={user} size="xl" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{user.role}</div>
                  </div>
                  {metrics && <UserMetricsBadge metrics={metrics} compact />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <PersonDetailModal
        userId={selectedUserId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isManager={isManager}
        onUpdate={onUpdate}
      />
    </>
  );
}
