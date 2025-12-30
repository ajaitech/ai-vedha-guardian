/**
 * AiVedha Guardian - Admin Documentation Page
 * Phase 15: Complete implementation documentation
 *
 * This page displays technical documentation for administrators
 * covering the dual-region infrastructure, API endpoints, and configuration.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Book,
  Server,
  Globe,
  Database,
  Shield,
  CreditCard,
  Mail,
  GitBranch,
  Layers,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { CLIPBOARD_FEEDBACK_DURATION_MS } from '@/constants/subscription';

// Documentation sections
const DOCS_SECTIONS = [
  {
    id: 'architecture',
    title: 'System Architecture',
    icon: Layers,
    description: 'Dual-region infrastructure overview',
  },
  {
    id: 'regions',
    title: 'Regional Configuration',
    icon: Globe,
    description: 'USA and India region setup',
  },
  {
    id: 'api',
    title: 'API Endpoints',
    icon: Server,
    description: 'API Gateway and Lambda configuration',
  },
  {
    id: 'database',
    title: 'Data Layer',
    icon: Database,
    description: 'DynamoDB and S3 configuration',
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    description: 'SSL, IAM, and access control',
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: CreditCard,
    description: 'PayPal integration and billing',
  },
  {
    id: 'email',
    title: 'Email',
    icon: Mail,
    description: 'SES templates and automation',
  },
  {
    id: 'cicd',
    title: 'CI/CD',
    icon: GitBranch,
    description: 'GitHub Actions workflows',
  },
];

// Configuration data
const REGION_CONFIG = {
  'us-east-1': {
    name: 'USA (Primary)',
    staticIP: '44.206.201.117',
    apiGateway: 'btxmpjub05',
    domain: 'api.aivedha.ai',
    lambdas: [
      'aivedha-guardian-security-crawler',
      'aivedha-guardian-audit-status',
      'aivedha-guardian-report-generator',
      'aivedha-guardian-user-auth',
      'aivedha-guardian-paypal-handler',
      'aivedha-guardian-subscription-manager',
    ],
  },
  'ap-south-1': {
    name: 'India (Secondary)',
    staticIP: '13.203.153.119',
    apiGateway: 'frxi92ysq0',
    domain: 'frxi92ysq0.execute-api.ap-south-1.amazonaws.com',
    lambdas: [
      'aivedha-guardian-security-crawler-india',
      'aivedha-guardian-audit-status-india',
      'aivedha-guardian-report-generator-india',
      'aivedha-guardian-url-validator-india',
    ],
  },
};

const DYNAMODB_TABLES = [
  { name: 'aivedha-guardian-users', purpose: 'User accounts', pk: 'user_id' },
  { name: 'aivedha-guardian-audit-reports', purpose: 'Audit results', pk: 'report_id' },
  { name: 'aivedha-guardian-subscriptions', purpose: 'Subscription data', pk: 'subscription_id' },
  { name: 'aivedha-guardian-credits', purpose: 'Credit transactions', pk: 'credit_id' },
  { name: 'aivedha-guardian-certificates', purpose: 'Security certificates', pk: 'certificate_number' },
  { name: 'aivedha-guardian-scheduled-audits', purpose: 'Scheduled audits', pk: 'schedule_id' },
  { name: 'aivedha-guardian-api-keys', purpose: 'API keys', pk: 'key_id' },
  { name: 'aivedha-guardian-email-logs', purpose: 'Email audit trail', pk: 'log_id' },
];

const SES_TEMPLATES = [
  { name: 'AiVedhaWelcomeEmail', purpose: 'New user welcome' },
  { name: 'AiVedhaLoginAlert', purpose: 'Login notifications' },
  { name: 'AiVedhaPaymentSuccess', purpose: 'Payment confirmation' },
  { name: 'AiVedhaSubscriptionReminder', purpose: 'Renewal reminders' },
  { name: 'AiVedhaAuditComplete', purpose: 'Audit completion notification' },
];

export default function Documentation() {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast({ title: 'Copied!', description: text });
    setTimeout(() => setCopiedText(null), CLIPBOARD_FEEDBACK_DURATION_MS);
  };

  const CopyButton = ({ text }: { text: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text)}
      className="h-6 px-2"
    >
      {copiedText === text ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Book className="h-6 w-6 text-primary" />
            Technical Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete infrastructure and configuration reference
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Last Updated: {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* Quick Navigation */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DOCS_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-primary/10 transition-colors text-sm"
              >
                <section.icon className="h-3.5 w-3.5 text-primary" />
                {section.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Architecture Section */}
      <Card id="architecture">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            System Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Frontend</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>React 18 + TypeScript + Vite</li>
                <li>Tailwind CSS + shadcn/ui</li>
                <li>Hosted on S3 + CloudFront</li>
                <li>Domain: aivedha.ai</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-medium text-purple-700 dark:text-purple-400 mb-2">Backend</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>AWS Lambda (Python 3.11)</li>
                <li>API Gateway (REST)</li>
                <li>DynamoDB (single region)</li>
                <li>SES for email</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Key Principles</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Dual-region Lambda for low-latency scanning (USA + India)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Single DynamoDB region (us-east-1) for data consistency</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Static Elastic IPs for firewall whitelisting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Single payment gateway (PayPal) with USD currency</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Regional Configuration */}
      <Card id="regions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Regional Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(REGION_CONFIG).map(([region, config]) => (
              <div key={region} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{config.name}</h4>
                  <Badge variant="outline">{region}</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Static IP:</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                        {config.staticIP}
                      </code>
                      <CopyButton text={config.staticIP} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Gateway:</span>
                    <code className="font-mono text-xs">{config.apiGateway}</code>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Domain:</span>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs">{config.domain}</code>
                      <CopyButton text={config.domain} />
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Lambda Functions:</span>
                    <ul className="mt-1 space-y-1">
                      {config.lambdas.map((fn) => (
                        <li key={fn} className="text-xs font-mono text-muted-foreground pl-2">
                          • {fn}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card id="api">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="audit" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">POST</Badge>
                  /api/audit/start
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`{
  "url": "https://example.com",
  "userId": "user@email.com",
  "auditMetadata": {
    "source": "web",
    "timezone": "Asia/Kolkata"
  }
}`}
                </pre>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="status" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  /api/audit/status/:reportId
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Returns current audit progress and results
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="subscription" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">POST</Badge>
                  /api/subscription/checkout
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Creates PayPal checkout session for subscription
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="health" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">GET</Badge>
                  /api/health
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  API health check endpoint for monitoring
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Database */}
      <Card id="database">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Layer (DynamoDB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              All tables are in <strong>us-east-1</strong> - both Lambda regions access the same data
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Table Name</th>
                  <th className="text-left py-2 font-medium">Purpose</th>
                  <th className="text-left py-2 font-medium">Primary Key</th>
                </tr>
              </thead>
              <tbody>
                {DYNAMODB_TABLES.map((table) => (
                  <tr key={table.name} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">{table.name}</td>
                    <td className="py-2 text-muted-foreground">{table.purpose}</td>
                    <td className="py-2 font-mono text-xs">{table.pk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card id="email">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Templates (SES)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SES_TEMPLATES.map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-mono text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.purpose}</p>
                </div>
                <Badge variant="outline">us-east-1</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CI/CD */}
      <Card id="cicd">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            CI/CD Workflows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Workflow: deploy.yml</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Deploys frontend to S3 + CloudFront</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Deploys Lambda to both regions (us-east-1 + ap-south-1)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Runs post-deployment security audit</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Generates deployment summary</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-2">GitHub Secrets Required</h4>
            <ul className="text-sm space-y-1 font-mono text-muted-foreground">
              <li>• AWS_ACCESS_KEY_ID</li>
              <li>• AWS_SECRET_ACCESS_KEY</li>
              <li>• AIVEDHA_API_KEY (for post-deployment audit)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>
          For additional support, contact{' '}
          <a href="mailto:support@aivedha.ai" className="text-primary hover:underline">
            support@aivedha.ai
          </a>
        </p>
      </div>
    </div>
  );
}
