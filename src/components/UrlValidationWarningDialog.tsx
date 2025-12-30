import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ExternalLink, Server, Clock, Shield, XCircle } from "lucide-react";

interface UrlValidationResult {
  status_code: number | null;
  status_text: string | null;
  is_error_page: boolean;
  error_type: string | null;
  error_message: string | null;
  response_time_ms: number | null;
  ssl_valid: boolean | null;
  server: string | null;
}

interface UrlValidationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  validationResult: UrlValidationResult | null;
  onProceed: () => void;
  onCancel: () => void;
}

export function UrlValidationWarningDialog({
  open,
  onOpenChange,
  url,
  validationResult,
  onProceed,
  onCancel,
}: UrlValidationWarningDialogProps) {
  const [isProceeding, setIsProceeding] = useState(false);

  const handleProceed = () => {
    setIsProceeding(true);
    onProceed();
  };

  const getErrorIcon = () => {
    const statusCode = validationResult?.status_code;
    if (statusCode === 404) return "🔍";
    if (statusCode === 500) return "💥";
    if (statusCode === 502 || statusCode === 503) return "🔧";
    if (statusCode === 403) return "🔒";
    if (validationResult?.error_type === 'timeout') return "⏰";
    if (validationResult?.error_type === 'connection_error') return "🔌";
    return "⚠️";
  };

  const getStatusColor = () => {
    const statusCode = validationResult?.status_code;
    if (statusCode && statusCode >= 500) return "text-red-500";
    if (statusCode && statusCode >= 400) return "text-orange-500";
    return "text-yellow-500";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg bg-gradient-to-br from-card to-card/95 border-yellow-500/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <span>URL Validation Warning</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="text-lg text-foreground font-medium">
              The target URL appears to be returning an error page.
            </div>

            {/* URL Display */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-mono truncate text-foreground">{url}</span>
            </div>

            {/* Error Details */}
            {validationResult && (
              <div className="space-y-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getErrorIcon()}</span>
                  <span className={`font-bold ${getStatusColor()}`}>
                    {validationResult.status_code
                      ? `HTTP ${validationResult.status_code}`
                      : validationResult.error_type?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {validationResult.status_code && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-foreground">{validationResult.status_text || 'Error'}</span>
                    </div>
                  )}

                  {validationResult.response_time_ms && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-foreground">{validationResult.response_time_ms}ms</span>
                    </div>
                  )}

                  {validationResult.server && (
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-purple-400" />
                      <span className="text-muted-foreground">Server:</span>
                      <span className="text-foreground truncate">{validationResult.server}</span>
                    </div>
                  )}

                  {validationResult.ssl_valid !== null && (
                    <div className="flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${validationResult.ssl_valid ? 'text-green-400' : 'text-red-400'}`} />
                      <span className="text-muted-foreground">SSL:</span>
                      <span className={validationResult.ssl_valid ? 'text-green-400' : 'text-red-400'}>
                        {validationResult.ssl_valid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  )}
                </div>

                {validationResult.error_message && (
                  <div className="text-sm text-red-400 border-t border-red-500/30 pt-2 mt-2">
                    {validationResult.error_message}
                  </div>
                )}
              </div>
            )}

            {/* Warning Message */}
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-yellow-200">
                <strong>Warning:</strong> Auditing error pages typically provides no useful security insights
                and will consume one of your audit credits. The audit will still run, but results may be limited.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Do you still want to proceed with the security audit?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-muted hover:bg-muted/80"
          >
            Cancel Audit
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleProceed}
            disabled={isProceeding}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isProceeding ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Proceeding...
              </span>
            ) : (
              "Proceed Anyway"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UrlValidationWarningDialog;
