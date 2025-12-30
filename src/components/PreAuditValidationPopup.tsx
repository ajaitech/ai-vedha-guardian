/**
 * Pre-Audit Validation Popup
 * Shows validation information before starting a security audit
 * Includes IP whitelisting info and region selection
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Globe,
  Server,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  MapPin,
  Zap,
  Lock,
} from 'lucide-react';
import {
  ScanRegion,
  REGIONS,
  detectUserRegion,
  selectOptimalRegion,
  getRegionInfo,
  getAllStaticIPs,
} from '@/lib/regionRouter';
import { CLIPBOARD_FEEDBACK_DURATION_MS } from '@/constants/subscription';

interface PreAuditValidationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (region: ScanRegion) => void;
  targetUrl: string;
  isSubscribed: boolean;
  isLoading?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  hostname: string;
  protocol: string;
  warnings: string[];
  errors: string[];
}

function validateUrl(url: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    hostname: '',
    protocol: '',
    warnings: [],
    errors: [],
  };

  try {
    const parsed = new URL(url);
    result.hostname = parsed.hostname;
    result.protocol = parsed.protocol;

    // Check protocol
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      result.errors.push('Only HTTP and HTTPS protocols are supported');
      return result;
    }

    if (parsed.protocol === 'http:') {
      result.warnings.push('HTTP sites may have limited security features to scan');
    }

    // Check for localhost
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.startsWith('192.168.') ||
      parsed.hostname.startsWith('10.')
    ) {
      result.errors.push('Local/private IP addresses cannot be scanned');
      return result;
    }

    // Check for valid domain
    if (!parsed.hostname.includes('.')) {
      result.errors.push('Please enter a valid domain name');
      return result;
    }

    result.isValid = true;
  } catch {
    result.errors.push('Invalid URL format. Please enter a valid URL.');
  }

  return result;
}

export function PreAuditValidationPopup({
  isOpen,
  onClose,
  onConfirm,
  targetUrl,
  isSubscribed,
  isLoading = false,
}: PreAuditValidationPopupProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<ScanRegion>('us-east-1');
  const [acknowledgeWhitelist, setAcknowledgeWhitelist] = useState(false);
  const [copiedIP, setCopiedIP] = useState<string | null>(null);

  // Validate URL and detect region on open
  useEffect(() => {
    if (isOpen && targetUrl) {
      const result = validateUrl(targetUrl);
      setValidation(result);

      // Auto-select optimal region
      const userRegion = detectUserRegion();
      const optimalRegion = selectOptimalRegion(targetUrl, userRegion);
      setSelectedRegion(optimalRegion);
    }
  }, [isOpen, targetUrl]);

  const handleCopyIP = async (ip: string) => {
    await navigator.clipboard.writeText(ip);
    setCopiedIP(ip);
    setTimeout(() => setCopiedIP(null), CLIPBOARD_FEEDBACK_DURATION_MS);
  };

  const handleConfirm = () => {
    onConfirm(selectedRegion);
  };

  const regionInfo = getRegionInfo(selectedRegion);
  const allIPs = getAllStaticIPs();

  if (!validation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-primary" />
            Pre-Audit Validation
          </DialogTitle>
          <DialogDescription>
            Please review the following before starting your security audit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Validation Status */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Target URL</p>
                <p className="text-xs text-muted-foreground break-all mt-1">
                  {targetUrl}
                </p>

                {validation.isValid ? (
                  <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Valid URL
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Invalid URL
                  </Badge>
                )}
              </div>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Alert className="mt-3 bg-yellow-500/10 border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                  {validation.warnings.map((warn, i) => (
                    <p key={i}>{warn}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Region Selection */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Scan Region</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the region closest to your target server for best results
                </p>

                <div className="flex gap-2 mt-3">
                  {Object.values(REGIONS).map((region) => (
                    <button
                      key={region.region}
                      onClick={() => setSelectedRegion(region.region)}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        selectedRegion === region.region
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-medium text-sm">{region.regionName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {region.region}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* IP Whitelisting Information */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">IP Whitelisting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSubscribed
                    ? 'Whitelist these IPs in your WAF/firewall for complete scanning:'
                    : 'Our scanners use these static IP addresses:'}
                </p>

                <div className="mt-3 space-y-2">
                  {isSubscribed ? (
                    // Show all IPs for paid users
                    allIPs.map((ip, index) => (
                      <div
                        key={ip}
                        className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono">{ip}</code>
                          <Badge variant="outline" className="text-xs">
                            {index === 0 ? 'USA' : 'India'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyIP(ip)}
                          className="h-7 px-2"
                        >
                          {copiedIP === ip ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))
                  ) : (
                    // Masked IPs for free users
                    <div className="relative">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 blur-sm">
                        <code className="text-sm font-mono">**.***.***.***</code>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span>Subscribe to view IPs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isSubscribed && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected region IP: <strong>{regionInfo.staticIP}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Acknowledgment */}
          {validation.isValid && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledgeWhitelist}
                onCheckedChange={(checked) => setAcknowledgeWhitelist(checked === true)}
              />
              <Label htmlFor="acknowledge" className="text-sm text-muted-foreground cursor-pointer">
                I understand that security scans may trigger WAF/firewall alerts. I have
                appropriate authorization to scan this website.
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.isValid || !acknowledgeWhitelist || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Start Audit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PreAuditValidationPopup;
