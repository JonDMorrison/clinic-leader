/**
 * ClinicLeader Logo Design System Constants
 * Typography, spacing, and sizing rules for consistent branding
 */

export const LOGO_SPACING = {
  /** Icon-to-text gap as ratio of icon size (e.g., 0.3 = 30% of icon height) */
  iconToTextRatio: 0.3,
  /** Minimum clear space around logo as ratio of icon size */
  clearSpaceRatio: 0.5,
  /** Wordmark height as ratio of icon size */
  wordmarkRatio: 0.5,
} as const;

export const LOGO_SIZES = {
  /** Favicon size */
  favicon: 16,
  /** Sidebar collapsed state */
  sidebarCollapsed: 32,
  /** Sidebar expanded state */
  sidebar: 40,
  /** Public navigation bar */
  nav: 36,
  /** Authentication pages */
  auth: 48,
  /** Hero sections */
  hero: 64,
} as const;

export const LOGO_TYPOGRAPHY = {
  /** Font family for wordmark */
  fontFamily: 'Inter, system-ui, sans-serif',
  /** Font weight for wordmark (semibold for legibility) */
  fontWeight: 600,
  /** Letter spacing for wordmark (tighter tracking) */
  letterSpacing: '-0.02em',
} as const;

export const LOGO_MIN_SIZES = {
  /** Minimum icon-only size in pixels */
  iconMin: 16,
  /** Minimum full logo width in pixels */
  fullLogoMin: 120,
} as const;

export type LogoSize = keyof typeof LOGO_SIZES;
