import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonDetailModal } from "./PersonDetailModal";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
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

  const handleOpenModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleOpenModal(user.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md"
              >
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="font-medium text-sm">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{user.role}</div>
                </div>
              </div>
            ))}
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
