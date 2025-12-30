import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Key,
  CreditCard,
  Cloud,
  Mail,
  Shield,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  TestTube,
  Lock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// API Base URL
const API_URL = import.meta.env.PROD
  ? 'https://api.aivedha.ai/api'
  : '/api';

interface SettingValue {
  value: string;
  is_set: boolean;
  is_sensitive: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

interface CategoryConfig {
  category: string;
  display_name: string;
  key_count: number;
  has_sensitive: boolean;
  required_role: string;
  has_access: boolean;
}

interface CategorySettings {
  category: string;
  display_name: string;
  settings: Record<string, SettingValue>;
  required_role: string;
}

const SystemSettings = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('jwt');
  const [categorySettings, setCategorySettings] = useState<CategorySettings | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Support');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/settings/categories`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
        setUserRole(data.user_role);
        // Set first accessible category as active
        const firstAccessible = data.categories.find((c: CategoryConfig) => c.has_access);
        if (firstAccessible) {
          setActiveCategory(firstAccessible.category);
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch categories',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to settings API',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, toast]);

  const fetchCategorySettings = useCallback(async (category: string) => {
    try {
      const response = await fetch(`${API_URL}/settings/category/${category}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        setCategorySettings(data);
        // Initialize edit values
        const values: Record<string, string> = {};
        Object.entries(data.settings).forEach(([key, setting]) => {
          values[key] = (setting as SettingValue).is_sensitive ? '' : (setting as SettingValue).value;
        });
        setEditValues(values);
      } else if (response.status === 403) {
        toast({
          title: 'Access Denied',
          description: `You need ${data.message?.match(/Required: (.+)$/)?.[1] || 'higher'} role to access this section`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      logger.error('Failed to fetch settings:', error);
    }
  }, [getAuthHeaders, toast]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch category settings when active category changes
  useEffect(() => {
    if (activeCategory) {
      fetchCategorySettings(activeCategory);
    }
  }, [activeCategory, fetchCategorySettings]);

  const handleSaveSetting = async (key: string) => {
    if (!categorySettings) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings/update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: categorySettings.category,
          key,
          value: editValues[key]
        })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Setting "${key}" updated successfully`
        });
        // Refresh settings
        fetchCategorySettings(categorySettings.category);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update setting',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save setting',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    if (!categorySettings) return;

    // Filter only changed values
    const changedValues: Record<string, string> = {};
    Object.entries(editValues).forEach(([key, value]) => {
      const original = categorySettings.settings[key];
      if (value && (original?.is_sensitive || value !== original?.value)) {
        changedValues[key] = value;
      }
    });

    if (Object.keys(changedValues).length === 0) {
      toast({
        title: 'No Changes',
        description: 'No settings have been modified'
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings/bulk-update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: categorySettings.category,
          settings: changedValues
        })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Updated ${data.updated?.length || 0} settings`
        });
        fetchCategorySettings(categorySettings.category);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update settings',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (service: string) => {
    setTestingConnection(service);
    try {
      const response = await fetch(`${API_URL}/settings/test-connection`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ service })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message || `${service.toUpperCase()} connection verified`
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || data.message || 'Connection test failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/export`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aivedha-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Export Complete',
          description: 'Settings exported successfully (sensitive values excluded)'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export settings',
        variant: 'destructive'
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      jwt: <Key className="h-4 w-4" />,
      payment_paypal: <CreditCard className="h-4 w-4" />,
      aws_cognito: <Cloud className="h-4 w-4" />,
      aws_ses: <Mail className="h-4 w-4" />,
      aws_s3: <Cloud className="h-4 w-4" />,
      api_keys: <Key className="h-4 w-4" />,
      subscription_plans: <CreditCard className="h-4 w-4" />,
      security_audit: <Shield className="h-4 w-4" />,
      email_templates: <Mail className="h-4 w-4" />,
      feature_flags: <Settings className="h-4 w-4" />
    };
    return icons[category] || <Settings className="h-4 w-4" />;
  };

  const renderSettingInput = (key: string, setting: SettingValue) => {
    const isPassword = setting.is_sensitive;
    const showPassword = showSensitive[key];

    return (
      <div key={key} className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {isPassword && <Lock className="h-3 w-3 text-muted-foreground" />}
          </Label>
          <div className="flex items-center gap-2">
            {setting.is_set ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Not Set
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              id={key}
              type={isPassword && !showPassword ? 'password' : 'text'}
              value={editValues[key] || ''}
              onChange={(e) => setEditValues({...editValues, [key]: e.target.value})}
              placeholder={isPassword ? (setting.is_set ? '********' : 'Enter secret value') : 'Enter value'}
              className="pr-10"
            />
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSensitive({...showSensitive, [key]: !showPassword})}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => handleSaveSetting(key)}
            disabled={saving || !editValues[key]}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>

        {setting.updated_at && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(setting.updated_at).toLocaleString()} by {setting.updated_by}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Manage application configuration, API keys, and security settings
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary px-4 py-2" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">Your Role: {userRole}</Badge>
        {userRole === 'Super Admin' && (
          <Badge variant="default">Full Access</Badge>
        )}
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.category}
              value={cat.category}
              disabled={!cat.has_access}
              className="flex items-center gap-2 text-xs"
            >
              {getCategoryIcon(cat.category)}
              <span>{cat.display_name}</span>
              {cat.has_sensitive && <Lock className="h-3 w-3" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.category} value={cat.category} className="space-y-6">
            {categorySettings && categorySettings.category === cat.category ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getCategoryIcon(cat.category)}
                          {categorySettings.display_name}
                        </CardTitle>
                        <CardDescription>
                          Required Role: {categorySettings.required_role}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {(cat.category === 'payment_paypal' || cat.category === 'aws_ses') && (
                          <button
                            onClick={() => handleTestConnection(cat.category.replace('payment_', '').replace('aws_', ''))}
                            disabled={testingConnection !== null}
                            className="btn-secondary px-3 py-1.5 text-sm rounded-lg inline-flex items-center"
                          >
                            {testingConnection === cat.category.replace('payment_', '').replace('aws_', '') ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                          </button>
                        )}
                        <button onClick={handleBulkSave} disabled={saving} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
                          {saving ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save All Changes
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(categorySettings.settings).map(([key, setting]) =>
                        renderSettingInput(key, setting)
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category-specific help text */}
                {cat.category === 'jwt' && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-amber-800 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Security Notice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-amber-700 text-sm">
                      <p>JWT secrets are critical security values. Changing these will invalidate all existing tokens and log out all users. Use strong, randomly generated secrets of at least 256 bits.</p>
                    </CardContent>
                  </Card>
                )}

                {cat.category === 'payment_paypal' && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-blue-800 text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        PayPal Integration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-blue-700 text-sm">
                      <p>Configure your PayPal API credentials from the PayPal Developer Dashboard. PayPal handles global payments, subscriptions, and local payment methods automatically. Make sure to use live credentials for production.</p>
                    </CardContent>
                  </Card>
                )}

                {cat.category === 'feature_flags' && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-purple-800 text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Feature Flags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-purple-700 text-sm">
                      <p>Feature flags control which features are enabled in the application. Use "true" or "false" values. Changes take effect immediately for all users.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading settings...
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SystemSettings;
