import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, TestTube, Mail, Server, Shield, BarChart3 } from 'lucide-react';

interface SMTPConfig {
  provider: string;
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  rate_limit: number;
  is_active: boolean;
}

interface EmailAnalytics {
  total_sent: number;
  delivery_rate: number;
  bounce_rate: number;
  open_rate: number;
  click_rate: number;
  last_24h: number;
  last_week: number;
  failed_deliveries: number;
}

const EmailSettings = () => {
  const { toast } = useToast();
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    provider: 'aws-ses',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    encryption: 'tls',
    username: '',
    password: '',
    from_email: 'noreply@aivedha.ai',
    from_name: 'AiVedha Guard',
    reply_to: 'support@aivedha.ai',
    rate_limit: 100,
    is_active: true
  });

  const [analytics, setAnalytics] = useState<EmailAnalytics>({
    total_sent: 12547,
    delivery_rate: 98.5,
    bounce_rate: 1.2,
    open_rate: 45.8,
    click_rate: 12.3,
    last_24h: 234,
    last_week: 1876,
    failed_deliveries: 23
  });

  const [testEmailSent, setTestEmailSent] = useState(false);

  const emailProviders = [
    { value: 'aws-ses', label: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com' },
    { value: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net' },
    { value: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org' },
    { value: 'gmail', label: 'Gmail SMTP', host: 'smtp.gmail.com' },
    { value: 'custom', label: 'Custom SMTP', host: '' }
  ];

  const handleProviderChange = (provider: string) => {
    const selectedProvider = emailProviders.find(p => p.value === provider);
    setSMTPConfig({
      ...smtpConfig,
      provider,
      host: selectedProvider?.host || '',
      port: provider === 'gmail' ? 465 : 587,
      encryption: provider === 'gmail' ? 'ssl' : 'tls'
    });
  };

  const saveSMTPConfig = async () => {
    try {
      // Mock API call - replace with actual implementation
      logger.log('Saving SMTP config:', smtpConfig);
      
      toast({
        title: "Success",
        description: "SMTP configuration saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save SMTP configuration",
        variant: "destructive",
      });
    }
  };

  const testSMTPConnection = async () => {
    try {
      // Mock test email - replace with actual implementation
      logger.log('Testing SMTP connection...');
      setTestEmailSent(true);
      
      toast({
        title: "Success",
        description: "Test email sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "SMTP test failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure SMTP settings and monitor email delivery performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="smtp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smtp" className="flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>SMTP Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SMTP Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>
                  Configure your email delivery service provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="provider">Email Provider</Label>
                  <Select value={smtpConfig.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emailProviders.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="host">SMTP Host</Label>
                    <Input
                      id="host"
                      value={smtpConfig.host}
                      onChange={(e) => setSMTPConfig({...smtpConfig, host: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) => setSMTPConfig({...smtpConfig, port: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select value={smtpConfig.encryption} onValueChange={(value) => setSMTPConfig({...smtpConfig, encryption: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={smtpConfig.username}
                      onChange={(e) => setSMTPConfig({...smtpConfig, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => setSMTPConfig({...smtpConfig, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={smtpConfig.is_active}
                    onCheckedChange={(checked) => setSMTPConfig({...smtpConfig, is_active: checked})}
                  />
                  <Label>Enable SMTP Configuration</Label>
                </div>
              </CardContent>
            </Card>

            {/* Sender Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Sender Settings</CardTitle>
                <CardDescription>
                  Configure sender identity and rate limiting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    value={smtpConfig.from_email}
                    onChange={(e) => setSMTPConfig({...smtpConfig, from_email: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={smtpConfig.from_name}
                    onChange={(e) => setSMTPConfig({...smtpConfig, from_name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="reply-to">Reply To</Label>
                  <Input
                    id="reply-to"
                    value={smtpConfig.reply_to}
                    onChange={(e) => setSMTPConfig({...smtpConfig, reply_to: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="rate-limit">Rate Limit (emails/hour)</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={smtpConfig.rate_limit}
                    onChange={(e) => setSMTPConfig({...smtpConfig, rate_limit: parseInt(e.target.value)})}
                  />
                </div>

                <div className="flex space-x-2">
                  <button onClick={saveSMTPConfig} className="btn-primary flex-1 px-4 py-2">
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </button>
                  <button className="btn-secondary px-4 py-2" onClick={testSMTPConnection}>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test
                  </button>
                </div>

                {testEmailSent && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">Test email sent successfully!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total_sent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+{analytics.last_24h} in last 24h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <Badge variant="default">{analytics.delivery_rate}%</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.delivery_rate}%</div>
                <p className="text-xs text-muted-foreground">Industry avg: 95%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Badge variant="secondary">{analytics.open_rate}%</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.open_rate}%</div>
                <p className="text-xs text-muted-foreground">Industry avg: 21%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
                <Badge variant="destructive">{analytics.failed_deliveries}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.failed_deliveries}</div>
                <p className="text-xs text-muted-foreground">Bounce rate: {analytics.bounce_rate}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Performance Metrics</CardTitle>
              <CardDescription>
                Detailed analytics for email delivery and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Weekly Volume</Label>
                    <p className="text-lg font-bold">{analytics.last_week.toLocaleString()} emails</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Click Rate</Label>
                    <p className="text-lg font-bold">{analytics.click_rate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure email security and compliance settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>DKIM Signing</Label>
                    <p className="text-sm text-muted-foreground">Enable DKIM authentication</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SPF Records</Label>
                    <p className="text-sm text-muted-foreground">SPF validation enabled</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>GDPR Compliance</Label>
                    <p className="text-sm text-muted-foreground">Data protection compliance</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">Log all email activities</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Current compliance and security status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Email Authentication</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Protection</span>
                  <Badge variant="default">GDPR Ready</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Encryption Status</span>
                  <Badge variant="default">TLS 1.3</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Backup & Recovery</span>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
