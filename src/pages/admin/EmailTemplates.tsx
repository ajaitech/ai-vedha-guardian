import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, Edit, Plus, Save, X, Code, Mail, Settings, Users, CreditCard, MessageSquare } from 'lucide-react';

interface EmailTemplate {
  template_id: string;
  template_name: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content: string;
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  last_modified: string;
}

interface TemplateVariable {
  variable_id: string;
  variable_name: string;
  variable_type: string;
  description: string;
  default_value: string;
  is_global: boolean;
}

const EmailTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('visual');

  useEffect(() => {
    fetchTemplates();
    fetchVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      // NOTE: Email templates are managed directly in AWS SES Console
      // Available templates: AiVedhaWelcomeEmail, AiVedhaLoginAlert, AiVedhaPaymentSuccess, AiVedhaSubscriptionReminder
      // Backend sends emails via: aws_Lambda/email-notification.py
      // Admin API endpoint needed: GET /admin/email-templates (requires Lambda: admin-email-templates.py)
      setTemplates([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch email templates",
        variant: "destructive",
      });
    }
  };

  const fetchVariables = async () => {
    try {
      // Standard SES template variables
      const standardVariables: TemplateVariable[] = [
        { variable_id: 'user.fullName', variable_name: 'fullName', variable_type: 'user', description: 'Customer full name', default_value: '', is_global: true },
        { variable_id: 'user.email', variable_name: 'email', variable_type: 'user', description: 'Customer email address', default_value: '', is_global: true },
        { variable_id: 'transaction.amount', variable_name: 'amount', variable_type: 'transaction', description: 'Payment amount', default_value: '0', is_global: true },
        { variable_id: 'transaction.planName', variable_name: 'planName', variable_type: 'transaction', description: 'Subscription plan name', default_value: '', is_global: true },
        { variable_id: 'audit.url', variable_name: 'auditUrl', variable_type: 'audit', description: 'Audited website URL', default_value: '', is_global: true },
        { variable_id: 'audit.score', variable_name: 'securityScore', variable_type: 'audit', description: 'Security score (0-100)', default_value: '0', is_global: true },
      ];
      setVariables(standardVariables);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch template variables",
        variant: "destructive",
      });
    }
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <CreditCard className="h-4 w-4" />;
      case 'notification': return <Mail className="h-4 w-4" />;
      case 'marketing': return <Users className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'support': return <MessageSquare className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getVariableTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'transaction': return 'bg-green-100 text-green-800';
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const insertVariable = (variable: string) => {
    if (selectedTemplate && isEditing) {
      const newTemplate = { ...selectedTemplate };
      if (activeTab === 'html') {
        newTemplate.html_content += `{{${variable}}}`;
      } else {
        newTemplate.text_content += `{{${variable}}}`;
      }
      setSelectedTemplate(newTemplate);
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      // Mock save - replace with actual API call
      logger.log('Saving template:', selectedTemplate);
      
      toast({
        title: "Success",
        description: "Email template saved successfully",
      });
      setIsEditing(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive",
      });
    }
  };

  const previewTemplate = () => {
    if (!selectedTemplate) return '';
    
    // Replace variables with sample data for preview
    const sampleData = {
      'user.firstName': 'John',
      'user.lastName': 'Doe',
      'user.email': 'john.doe@example.com',
      'user.location': 'New York, USA',
      'transaction.receiptNumber': 'AIVEDHA-RPT-24-12-001',
      'transaction.date': '2024/12/27',
      'transaction.amount': '149.99',
      'transaction.currency': 'USD',
      'transaction.paymentMethod': 'Credit Card',
      'transaction.creditsAdded': '100',
      'company.name': 'AiVedha Guard',
      'company.supportEmail': 'support@aivedha.ai',
      'company.website': 'www.aivedha.tech'
    };

    let preview = selectedTemplate.html_content;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });

    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage and customize email templates for automated communications
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Choose a template type to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input id="template-name" />
              </div>
              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Payment Receipt</SelectItem>
                    <SelectItem value="notification">Service Notification</SelectItem>
                    <SelectItem value="marketing">Marketing Communication</SelectItem>
                    <SelectItem value="system">System Message</SelectItem>
                    <SelectItem value="support">Support Communication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="invertPrimary">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              {templates.length} email templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No templates</p>
                <p className="text-xs mt-1">Email templates are managed via AWS SES.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.template_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate?.template_id === template.template_id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditing(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getTemplateTypeIcon(template.template_type)}
                      <span className="font-medium text-sm">{template.template_name}</span>
                    </div>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {template.template_type.replace('-', ' ')}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Template Editor/Preview */}
        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTemplate.template_name}</CardTitle>
                    <CardDescription>
                      Version {selectedTemplate.version} • Last modified {new Date(selectedTemplate.last_modified).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <>
                        <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setIsEditing(true)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </button>
                        <button className="btn-secondary px-3 py-1.5 text-sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Test
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setIsEditing(false)}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </button>
                        <button className="btn-primary px-3 py-1.5 text-sm" onClick={saveTemplate}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="active-toggle" className="text-sm">Active</Label>
                    <Switch
                      id="active-toggle"
                      checked={selectedTemplate.is_active}
                      disabled={!isEditing}
                      onCheckedChange={(checked) => {
                        if (isEditing) {
                          setSelectedTemplate({
                            ...selectedTemplate,
                            is_active: checked
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="visual">Visual</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visual" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subject">Subject Line</Label>
                        <Input
                          id="subject"
                          value={selectedTemplate.subject}
                          disabled={!isEditing}
                          onChange={(e) => {
                            if (isEditing) {
                              setSelectedTemplate({
                                ...selectedTemplate,
                                subject: e.target.value
                              });
                            }
                          }}
                        />
                      </div>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Email Preview</Label>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={previewMode === 'desktop' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPreviewMode('desktop')}
                            >
                              Desktop
                            </Button>
                            <Button
                              variant={previewMode === 'mobile' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setPreviewMode('mobile')}
                            >
                              Mobile
                            </Button>
                          </div>
                        </div>
                        <div className={`border rounded-lg overflow-hidden ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                          <iframe
                            srcDoc={previewTemplate()}
                            className="w-full h-96 border-0"
                            title="Email Preview"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="html" className="space-y-4">
                    <div>
                      <Label htmlFor="html-content">HTML Content</Label>
                      <Textarea
                        id="html-content"
                        value={selectedTemplate.html_content}
                        disabled={!isEditing}
                        rows={20}
                        className="font-mono text-sm"
                        onChange={(e) => {
                          if (isEditing) {
                            setSelectedTemplate({
                              ...selectedTemplate,
                              html_content: e.target.value
                            });
                          }
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4">
                    <div>
                      <Label htmlFor="text-content">Plain Text Content</Label>
                      <Textarea
                        id="text-content"
                        value={selectedTemplate.text_content}
                        disabled={!isEditing}
                        rows={15}
                        onChange={(e) => {
                          if (isEditing) {
                            setSelectedTemplate({
                              ...selectedTemplate,
                              text_content: e.target.value
                            });
                          }
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              Select a template to view or edit
            </div>
          )}
        </Card>
      </div>

      {/* Template Variables */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Available Variables</CardTitle>
            <CardDescription>
              Click on any variable to insert it into your template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variables.map((variable) => (
                <div
                  key={variable.variable_id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => insertVariable(variable.variable_name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getVariableTypeColor(variable.variable_type)}>
                      {variable.variable_type}
                    </Badge>
                    <Code className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-mono">
                    {`{{${variable.variable_name}}}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {variable.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailTemplates;
