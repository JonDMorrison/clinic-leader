import { cn } from "@/lib/utils";
import { useId } from "react";

interface ClinicLeaderIconProps {
  className?: string;
  size?: number;
}

export const ClinicLeaderIcon = ({ className, size = 40 }: ClinicLeaderIconProps) => {
  // Use unique ID to prevent gradient conflicts when multiple instances render
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
      aria-label="ClinicLeader logo"
    >
      {/* Gradient definition using brand colors */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(210, 100%, 45%)" />
          <stop offset="100%" stopColor="hsl(172, 100%, 40%)" />
        </linearGradient>
      </defs>
      {/* Clean abstract CL mark - no circular border */}
      <path
        d="M8 10C8 8.89543 8.89543 8 10 8H18C19.1046 8 20 8.89543 20 10V14C20 15.1046 19.1046 16 18 16H14V24C14 25.1046 14.8954 26 16 26H18C19.1046 26 20 26.8954 20 28V30C20 31.1046 19.1046 32 18 32H10C8.89543 32 8 31.1046 8 30V10Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M22 10C22 8.89543 22.8954 8 24 8H26C27.1046 8 28 8.89543 28 10V24H30C31.1046 24 32 24.8954 32 26V30C32 31.1046 31.1046 32 30 32H24C22.8954 32 22 31.1046 22 30V10Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};
