import { cn } from "@/lib/utils";

interface ClinicLeaderIconProps {
  className?: string;
  size?: number;
}

export const ClinicLeaderIcon = ({ className, size = 40 }: ClinicLeaderIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
    >
      {/* Gradient definition using brand colors */}
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(210, 100%, 50%)" />
          <stop offset="100%" stopColor="hsl(172, 100%, 48%)" />
        </linearGradient>
      </defs>
      {/* Stylized C/compass mark */}
      <path
        d="M20 4C11.163 4 4 11.163 4 20C4 28.837 11.163 36 20 36C24.418 36 28.418 34.209 31.314 31.314L28.486 28.486C26.34 30.632 23.314 32 20 32C13.373 32 8 26.627 8 20C8 13.373 13.373 8 20 8C23.314 8 26.34 9.368 28.486 11.514L31.314 8.686C28.418 5.791 24.418 4 20 4Z"
        fill="url(#brandGradient)"
      />
      {/* Inner accent - arrow/compass point */}
      <path
        d="M20 12V20L26 14L20 12Z"
        fill="url(#brandGradient)"
      />
      <circle cx="20" cy="20" r="3" fill="url(#brandGradient)" />
    </svg>
  );
};
