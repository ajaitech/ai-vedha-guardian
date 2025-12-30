import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Users,
  CreditCard,
  Shield,
  TrendingUp,
  Server,
  Mail,
  Settings,
  BarChart3,
  FileText,
  Ticket,
  Globe,
  DollarSign
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalAudits: number;
  systemUptime: string;
  activeUsers: number;
  pendingTickets: number;
}

interface RegionStats {
  region: string;
  regionName: string;
  flag: string;
  staticIP: string;
  auditsToday: number;
  auditsTotal: number;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: string;
}

const AdminDashboard = () => {
  const { formatPrice, currencySymbol } = useCurrency();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 1247,
    totalRevenue: 45670,
    totalAudits: 3421,
    systemUptime: '99.9%',
    activeUsers: 89,
    pendingTickets: 12
  });

  // Region monitoring stats (v5.0.0)
  const [regionStats, setRegionStats] = useState<RegionStats[]>([
    {
      region: 'us-east-1',
      regionName: 'USA',
      flag: '🇺🇸',
      staticIP: '44.206.201.117',
      auditsToday: 0,
      auditsTotal: 0,
      status: 'healthy',
      lastChecked: new Date().toISOString()
    },
    {
      region: 'ap-south-1',
      regionName: 'India',
      flag: '🇮🇳',
      staticIP: '13.203.153.119',
      auditsToday: 0,
      auditsTotal: 0,
      status: 'healthy',
      lastChecked: new Date().toISOString()
    }
  ]);

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'New user registration', user: 'john@example.com', time: '2 minutes ago' },
    { id: 2, action: 'Security audit completed', user: 'sarah@company.com', time: '5 minutes ago' },
    { id: 3, action: 'Payment processed', user: 'alex@startup.io', time: '8 minutes ago' },
    { id: 4, action: 'Support ticket created', user: 'mike@business.com', time: '12 minutes ago' },
  ]);

  const quickActions = [
    { title: 'User Management', icon: Users, description: 'Manage users and permissions' },
    { title: 'Payment Analytics', icon: CreditCard, description: 'View payment and revenue data' },
    { title: 'Security Audits', icon: Shield, description: 'Monitor audit activities' },
    { title: 'System Settings', icon: Settings, description: 'Configure system parameters' },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage AiVedha Guard platform</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAudits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +23% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.systemUptime}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Regional Statistics (v5.0.0) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Infrastructure
            </CardTitle>
            <CardDescription>
              Multi-region scanning infrastructure status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {regionStats.map((region) => (
                <div key={region.region} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span className="text-xl">{region.flag}</span>
                      {region.regionName}
                    </h4>
                    <Badge className={
                      region.status === 'healthy' ? 'bg-green-500' :
                      region.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }>
                      {region.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{region.region}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Static IP:</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{region.staticIP}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audits Today:</span>
                      <span className="font-medium">{region.auditsToday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Audits:</span>
                      <span className="font-medium">{region.auditsTotal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <action.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">{action.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.user}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lambda Functions</span>
                  <Badge className="bg-green-500">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge className="bg-green-500">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <Badge className="bg-yellow-500">Warning</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Platform usage has increased by 23% this month. Consider scaling resources.
            </AlertDescription>
          </Alert>
          
          <Alert className="border-yellow-500">
            <Ticket className="h-4 w-4" />
            <AlertDescription>
              You have {stats.pendingTickets} pending support tickets requiring attention.
            </AlertDescription>
          </Alert>
        </div>
      </div>
  );
};

export default AdminDashboard;