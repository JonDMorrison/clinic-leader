import { cn } from "@/lib/utils";
import { ClinicLeaderIcon } from "./ClinicLeaderIcon";
import { LOGO_TYPOGRAPHY, LOGO_SPACING } from "@/components/brand/logoConstants";

interface ClinicLeaderLogoProps {
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the wordmark */
  showWordmark?: boolean;
  /** Variant for different contexts */
  variant?: "default" | "stacked";
}

export const ClinicLeaderLogo = ({
  size = 40,
  className,
  showWordmark = true,
  variant = "default",
}: ClinicLeaderLogoProps) => {
  // Calculate spacing based on icon size
  const gap = Math.round(size * LOGO_SPACING.iconToTextRatio);
  const wordmarkSize = Math.round(size * LOGO_SPACING.wordmarkRatio);

  if (variant === "stacked") {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <ClinicLeaderIcon size={size} />
        {showWordmark && (
          <span
            className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent"
            style={{
              fontFamily: LOGO_TYPOGRAPHY.fontFamily,
              fontWeight: LOGO_TYPOGRAPHY.fontWeight,
              letterSpacing: LOGO_TYPOGRAPHY.letterSpacing,
              fontSize: `${wordmarkSize}px`,
              lineHeight: 1.2,
              marginTop: `${gap * 0.5}px`,
            }}
          >
            ClinicLeader
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center", className)}
      style={{ gap: `${gap}px` }}
    >
      <ClinicLeaderIcon size={size} />
      {showWordmark && (
        <span
          className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent"
          style={{
            fontFamily: LOGO_TYPOGRAPHY.fontFamily,
            fontWeight: LOGO_TYPOGRAPHY.fontWeight,
            letterSpacing: LOGO_TYPOGRAPHY.letterSpacing,
            fontSize: `${wordmarkSize}px`,
            lineHeight: 1,
          }}
        >
          ClinicLeader
        </span>
      )}
    </div>
  );
};
