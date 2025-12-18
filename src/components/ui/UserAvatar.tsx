import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const avatarUrl = user?.avatar_url;
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={user?.full_name || "User avatar"} />
      ) : null}
      <AvatarFallback className="bg-muted text-muted-foreground">
        <User className={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  );
}
