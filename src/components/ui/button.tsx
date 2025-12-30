/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Default primary - inverts to foreground on hover
        default: "border-2 border-primary bg-primary text-primary-foreground hover:bg-background hover:text-primary hover:border-primary hover:shadow-3d-hover transition-all duration-300",
        // Destructive - inverts on hover
        destructive:
          "border-2 border-destructive bg-destructive text-destructive-foreground hover:bg-background hover:text-destructive hover:border-destructive hover:shadow-3d-hover transition-all duration-300",
        // Outline - inverts to filled on hover
        outline:
          "border-2 border-input bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-3d-hover transition-all duration-300",
        // Secondary - inverts on hover
        secondary:
          "border-2 border-secondary bg-secondary text-secondary-foreground hover:bg-background hover:text-secondary-foreground hover:border-secondary hover:shadow-3d-hover transition-all duration-300",
        // Ghost - transparent with border on hover
        ghost: "border-2 border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-3d-hover transition-all duration-300",
        // Link - underline effect with color inversion
        link: "border-2 border-transparent text-primary underline-offset-4 hover:underline hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all duration-300",
        // Hero - gradient with full inversion
        hero: "border-2 border-primary bg-gradient-primary text-white hover:bg-background hover:text-primary hover:border-primary hover:shadow-glow hover:scale-105 transition-all duration-300",
        // Glass - semi-transparent with inversion
        glass: "border-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-gray-900 hover:border-white hover:shadow-3d-hover transition-all duration-300",
        // Success - inverts on hover
        success: "border-2 border-success bg-success text-success-foreground hover:bg-background hover:text-success hover:border-success hover:shadow-3d-hover transition-all duration-300",
        // Warning - inverts on hover
        warning: "border-2 border-warning bg-warning text-warning-foreground hover:bg-background hover:text-warning hover:border-warning hover:shadow-3d-hover transition-all duration-300",
        // Invert variant: content-width, hover inverts background/text/border colors
        invert: "border-2 border-border bg-background text-foreground hover:bg-foreground hover:text-background hover:border-background dark:hover:bg-gray-100 dark:hover:text-gray-900 dark:hover:border-gray-900 transition-all duration-300",
        // Invert with primary colors
        invertPrimary: "border-2 border-primary bg-primary text-primary-foreground hover:bg-foreground hover:text-background hover:border-background dark:hover:bg-gray-100 dark:hover:text-gray-900 dark:hover:border-gray-900 transition-all duration-300",
        // Invert outline (starts transparent)
        invertOutline: "border-2 border-border bg-transparent text-foreground hover:bg-foreground hover:text-background hover:border-background dark:hover:bg-gray-100 dark:hover:text-gray-900 dark:hover:border-gray-900 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        // Compact - content width
        compact: "h-10 px-6 py-2 w-auto",
        compactSm: "h-9 px-4 py-1.5 w-auto",
        compactLg: "h-11 px-8 py-2.5 w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Export both Button (proper) and button (for backward compatibility)
export { Button, Button as button, buttonVariants, ButtonProps as buttonProps }
