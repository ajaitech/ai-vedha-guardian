/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        warning:
          "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
        info:
          "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        // Security severity variants with enriched design
        critical:
          "border-transparent bg-red-600 text-white shadow-sm shadow-red-500/30",
        high:
          "border-transparent bg-orange-500 text-white shadow-sm shadow-orange-500/30",
        medium:
          "border-transparent bg-yellow-500 text-white shadow-sm shadow-yellow-500/30",
        low:
          "border-transparent bg-green-500 text-white shadow-sm shadow-green-500/30",
        informational:
          "border-transparent bg-blue-500 text-white shadow-sm shadow-blue-500/30",
        // Security status variants
        secure:
          "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm",
        atrisk:
          "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-sm",
        vulnerable:
          "border-transparent bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 shadow-sm",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

// Utility to safely get severity badge variant from API string
type SeverityVariant = "critical" | "high" | "medium" | "low" | "informational" | "secondary";

const getSeverityVariant = (severity: string | null | undefined): SeverityVariant => {
  if (!severity) return "secondary";
  const normalized = String(severity).toLowerCase().trim();
  switch (normalized) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "info":
    case "informational":
      return "informational";
    default:
      return "secondary";
  }
};

// Utility to safely get security score badge variant
type ScoreVariant = "secure" | "atrisk" | "vulnerable" | "secondary";

const getScoreVariant = (score: number | null | undefined): ScoreVariant => {
  if (score === null || score === undefined || isNaN(Number(score))) return "secondary";
  const numScore = Number(score);
  if (numScore >= 7) return "secure";
  if (numScore >= 5) return "atrisk";
  return "vulnerable";
};

// Safe text sanitization for badge content (extra layer of protection)
const sanitizeBadgeText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return "-";
  // Remove any HTML tags and trim
  const sanitized = String(text).replace(/<[^>]*>/g, '').trim();
  // Truncate if too long
  return sanitized.length > maxLength ? sanitized.slice(0, maxLength) + '...' : sanitized;
};

export { Badge, badgeVariants, getSeverityVariant, getScoreVariant, sanitizeBadgeText }
