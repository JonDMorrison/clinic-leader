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
      {/* Shield shape */}
      <path
        d="M20 3L4 9V18C4 27.94 11.4 37.24 20 39C28.6 37.24 36 27.94 36 18V9L20 3Z"
        fill={`url(#${gradientId})`}
      />
      {/* Medical cross - white */}
      <path
        d="M17 13H23V18H28V24H23V29H17V24H12V18H17V13Z"
        fill="white"
      />
    </svg>
  );
};
