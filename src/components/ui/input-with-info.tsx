import * as React from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InputWithInfoProps extends React.ComponentProps<"input"> {
  helpText?: string;
  label?: string;
}

const InputWithInfo = React.forwardRef<HTMLInputElement, InputWithInfoProps>(
  ({ className, type, helpText, label, ...props }, ref) => {
    return (
      <div className="relative w-full max-w-[400px]">
        {label && (
          <label className="text-sm font-medium text-foreground mb-1 block">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              helpText && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-sm">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    )
  }
)
InputWithInfo.displayName = "InputWithInfo"

export { InputWithInfo }
