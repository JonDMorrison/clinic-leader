import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PersonDetailModal } from "./PersonDetailModal";
import { UserMetricsBadge } from "./UserMetricsBadge";
import { useUsersMetrics } from "@/hooks/useUserMetrics";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
}

export function PeopleAnalyzer({ users, coreValues, valueRatings, isManager, onUpdate }: PeopleAnalyzerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  
  // Fetch metrics for all users in bulk
  const userIds = users.map((u) => u.id);
  const { metricsMap } = useUsersMetrics(userIds, currentUser?.team_id);

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
