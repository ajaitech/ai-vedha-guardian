/**
 * EmbedCodeDialog Component
 *
 * Provides embed code options for website owners to display their
 * AiVedha Guard security badge on their websites.
 *
 * Supports multiple embed formats:
 * - HTML (Direct img + link)
 * - JavaScript (Dynamic widget)
 * - WordPress shortcode
 * - React component snippet
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Code, Globe, Shield, ExternalLink } from 'lucide-react';
import { APP_CONFIG } from '@/config';
import { CLIPBOARD_FEEDBACK_DURATION_MS } from '@/constants/subscription';

export interface EmbedCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateNumber: string;
  domain: string;
  securityScore: number;
  badgeImageUrl?: string; // Optional pre-generated image URL
}

// Badge variant configurations
const BADGE_VARIANTS = [
  { id: 'full', name: 'Full Badge', description: 'Complete badge with score and details', width: 320, height: 280 },
  { id: 'compact', name: 'Compact', description: 'Smaller badge for sidebars', width: 220, height: 72 },
  { id: 'minimal', name: 'Minimal', description: 'Small icon badge', width: 48, height: 48 },
] as const;

type BadgeVariant = typeof BADGE_VARIANTS[number]['id'];

const EmbedCodeDialog: React.FC<EmbedCodeDialogProps> = ({
  open,
  onOpenChange,
  certificateNumber,
  domain,
  securityScore,
  badgeImageUrl,
}) => {
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<BadgeVariant>('full');
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark');

  const verifyUrl = APP_CONFIG.getVerifyUrl(certificateNumber);
  const imageBaseUrl = badgeImageUrl || `${APP_CONFIG.API_BASE_URL}/badge/${certificateNumber}`;

  // Format score to max 1 decimal place
  const formattedScore = securityScore % 1 === 0 ? securityScore.toString() : securityScore.toFixed(1);

  // Generate embed codes for each format
  const getHTMLCode = (): string => {
    const variant = BADGE_VARIANTS.find(v => v.id === selectedVariant) || BADGE_VARIANTS[0];
    return `<!-- AiVedha Guard Security Badge -->
<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" title="Verified by AiVedha Guard">
  <img
    src="${imageBaseUrl}?variant=${selectedVariant}&theme=${selectedTheme}"
    alt="AiVedha Guard Security Verified - Score ${formattedScore}/10"
    width="${variant.width}"
    height="${variant.height}"
    style="border: none;"
  />
</a>
<!-- End AiVedha Guard Badge -->`;
  };

  const getJavaScriptCode = (): string => {
    return `<!-- AiVedha Guard Security Badge Widget -->
<div id="aivedha-security-badge"></div>
<script>
(function() {
  var badge = document.getElementById('aivedha-security-badge');
  if (!badge) return;

  var config = {
    certificateNumber: '${certificateNumber}',
    variant: '${selectedVariant}',
    theme: '${selectedTheme}'
  };

  var iframe = document.createElement('iframe');
  iframe.src = '${APP_CONFIG.BASE_URL}/badge/embed?' +
    'cert=' + config.certificateNumber +
    '&variant=' + config.variant +
    '&theme=' + config.theme;
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.width = '${BADGE_VARIANTS.find(v => v.id === selectedVariant)?.width || 320}';
  iframe.height = '${BADGE_VARIANTS.find(v => v.id === selectedVariant)?.height || 280}';
  iframe.title = 'AiVedha Guard Security Badge';

  badge.appendChild(iframe);
})();
</script>
<!-- End AiVedha Guard Widget -->`;
  };

  const getWordPressCode = (): string => {
    return `[aivedha_security_badge cert="${certificateNumber}" variant="${selectedVariant}" theme="${selectedTheme}"]

<!-- Or use HTML shortcode: -->
<a href="${verifyUrl}" target="_blank" rel="noopener">
  <img src="${imageBaseUrl}?variant=${selectedVariant}&theme=${selectedTheme}" alt="Security Verified" />
</a>`;
  };

  const getReactCode = (): string => {
    return `// AiVedha Guard Security Badge Component
import React from 'react';

const AiVedhaSecurityBadge = () => (
  <a
    href="${verifyUrl}"
    target="_blank"
    rel="noopener noreferrer"
    title="Verified by AiVedha Guard"
  >
    <img
      src="${imageBaseUrl}?variant=${selectedVariant}&theme=${selectedTheme}"
      alt="AiVedha Guard Security Verified - Score ${formattedScore}/10"
      width={${BADGE_VARIANTS.find(v => v.id === selectedVariant)?.width || 320}}
      height={${BADGE_VARIANTS.find(v => v.id === selectedVariant)?.height || 280}}
      style={{ border: 'none' }}
    />
  </a>
);

export default AiVedhaSecurityBadge;`;
  };

  const getDirectLinkCode = (): string => {
    return `Verification URL:
${verifyUrl}

Badge Image URL:
${imageBaseUrl}?variant=${selectedVariant}&theme=${selectedTheme}

Certificate Number:
${certificateNumber}`;
  };

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(type);
      toast({
        title: 'Copied!',
        description: `${type} code copied to clipboard`,
      });
      setTimeout(() => setCopied(null), CLIPBOARD_FEEDBACK_DURATION_MS);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please select and copy the code manually',
        variant: 'destructive',
      });
    }
  };

  const CodeBlock = ({ code, type }: { code: string; type: string }) => (
    <div className="relative">
      <Textarea
        value={code}
        readOnly
        className="font-mono text-xs min-h-[180px] bg-slate-900 text-slate-300 border-slate-700 resize-none"
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, type)}
      >
        {copied === type ? (
          <>
            <Check className="h-4 w-4 mr-1" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-1" /> Copy
          </>
        )}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/30 rounded-b-xl">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Embed Security Badge
          </DialogTitle>
          <DialogDescription>
            Add your AiVedha Guard security badge to your website to show visitors that your site has been audited.
          </DialogDescription>
        </DialogHeader>

        {/* Badge Preview */}
        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 mb-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Variant Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Badge Style</label>
              <div className="flex flex-col gap-2">
                {BADGE_VARIANTS.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedVariant === variant.id
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{variant.name}</div>
                    <div className="text-xs text-muted-foreground">{variant.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Theme</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedTheme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTheme('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={selectedTheme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTheme('light')}
                >
                  Light
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1">
              <label className="text-sm font-medium">Preview</label>
              <div
                className={`mt-2 p-4 rounded-lg flex items-center justify-center ${
                  selectedTheme === 'dark' ? 'bg-slate-950' : 'bg-white border'
                }`}
                style={{ minHeight: '120px' }}
              >
                <img
                  src={`${imageBaseUrl}?variant=${selectedVariant}&theme=${selectedTheme}&preview=true`}
                  alt="Badge Preview"
                  className="max-w-full"
                  onError={(e) => {
                    // Fallback to placeholder if image not available
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div style="text-align: center; color: ${selectedTheme === 'dark' ? '#94a3b8' : '#64748b'};">
                        <div style="font-size: 14px; margin-bottom: 4px;">Badge Preview</div>
                        <div style="font-size: 12px;">Score: ${formattedScore}/10</div>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Embed Code Tabs */}
        <Tabs defaultValue="html" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="html" className="text-xs">
              <Code className="h-3 w-3 mr-1" /> HTML
            </TabsTrigger>
            <TabsTrigger value="javascript" className="text-xs">
              <Globe className="h-3 w-3 mr-1" /> JavaScript
            </TabsTrigger>
            <TabsTrigger value="wordpress" className="text-xs">
              WordPress
            </TabsTrigger>
            <TabsTrigger value="react" className="text-xs">
              React
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" /> Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="mt-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">Recommended for most websites</Badge>
            </div>
            <CodeBlock code={getHTMLCode()} type="HTML" />
          </TabsContent>

          <TabsContent value="javascript" className="mt-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">Dynamic widget with auto-updates</Badge>
            </div>
            <CodeBlock code={getJavaScriptCode()} type="JavaScript" />
          </TabsContent>

          <TabsContent value="wordpress" className="mt-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">For WordPress sites</Badge>
            </div>
            <CodeBlock code={getWordPressCode()} type="WordPress" />
          </TabsContent>

          <TabsContent value="react" className="mt-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">For React/Next.js applications</Badge>
            </div>
            <CodeBlock code={getReactCode()} type="React" />
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">Direct links to share</Badge>
            </div>
            <CodeBlock code={getDirectLinkCode()} type="Link" />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Badge Verification</p>
              <p className="text-muted-foreground">
                When visitors click your badge, they&apos;ll be taken to a verification page at{' '}
                <code className="text-xs bg-slate-200 dark:bg-slate-800 px-1 rounded">aivedha.ai/verify/{certificateNumber}</code>{' '}
                where they can confirm your security audit status.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbedCodeDialog;
