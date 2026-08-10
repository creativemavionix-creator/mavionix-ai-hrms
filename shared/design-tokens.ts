/**
 * HireMind AI — Shared Design Tokens
 *
 * Consumed by both the admin dashboard and candidate portal.
 * If you change a color here, both apps stay in sync.
 */

export const colors = {
  // Brand & Accents
  primaryLight: "#7c3aed",
  primaryDark: "#8b5cf6",
  primaryHoverLight: "#6d28d9",
  primaryHoverDark: "#7c3aed",
  accentGradient: "linear-gradient(135deg, #8b5cf6, #d946ef)",

  // Backgrounds (Surfaces)
  bgCanvasLight: "#f6f5fa",
  bgCanvasDark: "#0a0910",
  bgCardLight: "#ffffff",
  bgCardDark: "#15131f",
  bgElevatedLight: "#faf9fd",
  bgElevatedDark: "#1c1a29",
  bgInsetLight: "#f0edf6",
  bgInsetDark: "#0d0c14",

  // Text
  textPrimaryLight: "#09090b",
  textPrimaryDark: "#f4f4f5",
  textSecondaryLight: "#52525b",
  textSecondaryDark: "#a1a1aa",
  textMutedLight: "#8e8e93",
  textMutedDark: "#71717a",

  // Borders
  borderLight: "#e4e4e7",
  borderDark: "rgba(255, 255, 255, 0.12)",
  borderSubtleLight: "#f4f4f5",
  borderSubtleDark: "rgba(255, 255, 255, 0.06)",

  // Semantic Hues
  success: "#22c55e",
  successMuted: "rgba(34, 197, 94, 0.1)",
  successBorder: "rgba(34, 197, 94, 0.2)",

  danger: "#ef4444",
  dangerMuted: "rgba(239, 68, 68, 0.1)",
  dangerBorder: "rgba(239, 68, 68, 0.2)",

  warning: "#f59e0b",
  warningMuted: "rgba(245, 158, 11, 0.1)",
  warningBorder: "rgba(245, 158, 11, 0.2)",

  info: "#3b82f6",
  infoMuted: "rgba(59, 130, 246, 0.1)",
  infoBorder: "rgba(59, 130, 246, 0.2)",

  purple: "#a855f7",
  purpleMuted: "rgba(168, 85, 247, 0.1)",
  purpleBorder: "rgba(168, 85, 247, 0.2)",
} as const

export const typography = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontMono: "'font-mono', monospace",
  // micro-labels tracked styling
  labelSize: "11px",
  labelTracking: "0.08em",
} as const

export const spacing = {
  radiusSm: "8px",
  radiusMd: "12px",
  radiusLg: "16px",
  radiusXl: "20px",
  radiusFull: "9999px",
  cardPadding: "24px",
  sectionGap: "32px",
} as const
