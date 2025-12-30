/**
 * Lightweight circular loading spinner
 * Designed to be rendered outside page flow via LoaderProvider (similar to LoginPopup pattern)
 * Shows instantly with smooth animations
 */

interface CircularLoaderProps {
  message?: string;
}

export function CircularLoader({ message = "Loading" }: CircularLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
        {/* Circular Spinner */}
        <div className="relative w-16 h-16">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
          {/* Animated spinning segment */}
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>

        {/* Loading text */}
        {message && (
          <p className="text-sm font-medium text-foreground/80 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal inline circular loader (no portal, for use inside components)
 */

interface CircularLoaderInlineProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function CircularLoaderInline({ size = "md", message }: CircularLoaderInlineProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
      </div>
      {message && (
        <p className="text-sm font-medium text-foreground/70 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

export default CircularLoader;
