/**
 * AiVedha Guardian - Professional Audit Error Display
 * Phase 8: Shows clear error messages with module breakdown
 */

import { AlertTriangle, CheckCircle, XCircle, Lock, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AuditModule {
  id: string;
  name: string;
  status: 'completed' | 'failed' | 'skipped' | 'pending';
  issueCount?: number;
  error?: string;
}

interface AuditErrorDisplayProps {
  completedModules: AuditModule[];
  failedModules: AuditModule[];
  scanRegion: string;
  staticIP: string;
  isPaidUser: boolean;
  reportId?: string;
  onViewReport?: () => void;
  onRetry?: () => void;
}

export function AuditErrorDisplay({
  completedModules,
  failedModules,
  scanRegion,
  staticIP,
  isPaidUser,
  reportId,
  onViewReport,
  onRetry
}: AuditErrorDisplayProps) {
  const totalModules = completedModules.length + failedModules.length;
  const completionRate = Math.round((completedModules.length / totalModules) * 100);

  const regionDisplay = scanRegion === 'ap-south-1' || scanRegion === 'india'
    ? { name: 'India', flag: '🇮🇳' }
    : { name: 'USA', flag: '🇺🇸' };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Limited Audit Results
        </CardTitle>
        <CardDescription>
          Some security modules couldn't complete due to site protection or network restrictions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Completion Summary */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">Completion Rate</span>
          <Badge variant={completionRate >= 80 ? 'default' : completionRate >= 50 ? 'secondary' : 'destructive'}>
            {completionRate}% ({completedModules.length}/{totalModules} modules)
          </Badge>
        </div>

        {/* Completed Modules */}
        {completedModules.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedModules.length} modules)
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {completedModules.slice(0, 8).map(m => (
                <span key={m.id} className="flex items-center gap-1">
                  <span className="text-green-600">•</span>
                  {m.name}
                  {m.issueCount !== undefined && m.issueCount > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs">{m.issueCount}</Badge>
                  )}
                </span>
              ))}
              {completedModules.length > 8 && (
                <span className="text-muted-foreground col-span-2">
                  ... and {completedModules.length - 8} more modules completed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Failed Modules */}
        {failedModules.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Could Not Complete ({failedModules.length} modules)
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {failedModules.map(m => (
                <span key={m.id} className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <span>•</span>
                  {m.name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              These modules may have been blocked by WAF, firewall, or rate limiting.
            </p>
          </div>
        )}

        {/* IP Whitelist Instructions - ONLY FOR PAID USERS */}
        {isPaidUser ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">
              To unlock full scanning:
            </h4>
            <p className="text-sm mt-2">
              Whitelist our scanner IP address in your firewall or WAF:
            </p>
            <div className="mt-2 bg-white dark:bg-gray-800 p-3 rounded border">
              <code className="text-sm font-mono">
                {staticIP}
              </code>
              <span className="ml-2 text-xs text-muted-foreground">
                ({regionDisplay.flag} {regionDisplay.name} Server)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              After whitelisting, retry the scan for complete results.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-dashed">
            <h4 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              IP Information Hidden
            </h4>
            <p className="text-sm mt-2 text-muted-foreground">
              Subscribe to a paid plan to view server IP addresses for whitelisting.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        )}

        {/* Scan Region Info */}
        <div className="text-center text-sm text-muted-foreground">
          Scanned from: {regionDisplay.flag} {regionDisplay.name} Region
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {reportId && onViewReport && (
          <Button onClick={onViewReport} className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Partial Report
          </Button>
        )}
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Scan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default AuditErrorDisplay;
