import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';

export function SessionWarningBanner() {
  const { isSessionExpiring, getTimeUntilExpiry, refreshSession, isAuthenticated } = useSession();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isSessionExpiring || !isAuthenticated) {
      setIsDismissed(false);
      return;
    }

    const updateTime = () => {
      const ms = getTimeUntilExpiry();
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isSessionExpiring, isAuthenticated, getTimeUntilExpiry]);

  const handleExtend = () => {
    refreshSession();
    setIsDismissed(true);
  };

  if (!isAuthenticated || !isSessionExpiring || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Alert className="bg-amber-500/10 border-amber-500/50 shadow-lg backdrop-blur-sm">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Session expiring in {timeRemaining}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-amber-500/20"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs border-amber-500/50 hover:bg-amber-500/20"
              onClick={handleExtend}
            >
              Extend Session
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
