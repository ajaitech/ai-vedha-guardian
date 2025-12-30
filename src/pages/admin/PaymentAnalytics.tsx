import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Settings,
  AlertCircle
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface PaymentGateway {
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  successRate: number;
  totalTransactions: number;
  revenue: number;
  priority: number;
}

interface Transaction {
  id: string;
  user: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'success' | 'failed' | 'pending';
  date: string;
  credits: number;
}

const PaymentAnalytics = () => {
  const { currencySymbol, formatPrice } = useCurrency();
  const [timeRange, setTimeRange] = useState('30d');
  
  const paymentGateways: PaymentGateway[] = [
    {
      name: 'PayPal',
      status: 'active',
      successRate: 98.1,
      totalTransactions: 2595,
      revenue: 41150,
      priority: 1
    }
  ];

  const recentTransactions: Transaction[] = [
    {
      id: 'TXN001',
      user: 'john@example.com',
      amount: 9,
      currency: 'USD',
      gateway: 'PayPal',
      status: 'success',
      date: '2024-01-20T10:30:00Z',
      credits: 10
    },
    {
      id: 'TXN002',
      user: 'sarah@company.com',
      amount: 35,
      currency: 'USD',
      gateway: 'PayPal',
      status: 'success',
      date: '2024-01-20T09:15:00Z',
      credits: 50
    },
    {
      id: 'TXN003',
      user: 'mike@startup.io',
      amount: 9,
      currency: 'USD',
      gateway: 'PayPal',
      status: 'failed',
      date: '2024-01-20T08:45:00Z',
      credits: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'destructive',
      maintenance: 'secondary'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getTransactionStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const totalRevenue = paymentGateways.reduce((sum, gateway) => sum + gateway.revenue, 0);
  const totalTransactions = paymentGateways.reduce((sum, gateway) => sum + gateway.totalTransactions, 0);
  const averageSuccessRate = paymentGateways.reduce((sum, gateway) => sum + gateway.successRate, 0) / paymentGateways.length;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Payment Analytics</h1>
            <p className="text-muted-foreground">Monitor payment gateways and revenue analytics</p>
          </div>
          <div className="flex space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <button className="btn-secondary px-4 py-2">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencySymbol}{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageSuccessRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                -0.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Gateways</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentGateways.filter(g => g.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">
                of {paymentGateways.length} total gateways
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gateways" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
            <TabsTrigger value="configuration">Gateway Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="gateways" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Gateway Performance</CardTitle>
                <CardDescription>Monitor gateway status and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentGateways.map((gateway) => (
                      <TableRow key={gateway.name}>
                        <TableCell className="font-medium">{gateway.name}</TableCell>
                        <TableCell>{getStatusBadge(gateway.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{gateway.successRate}%</span>
                            {gateway.successRate < 95 && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{gateway.totalTransactions.toLocaleString()}</TableCell>
                        <TableCell>{currencySymbol}{gateway.revenue.toLocaleString()}</TableCell>
                        <TableCell>{gateway.priority}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <button className="btn-secondary px-3 py-1.5 text-sm">Configure</button>
                            <button className="btn-secondary px-3 py-1.5 text-sm">Test</button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest payment transactions across all gateways</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">{transaction.id}</TableCell>
                        <TableCell>{transaction.user}</TableCell>
                        <TableCell>{currencySymbol}{transaction.amount}</TableCell>
                        <TableCell>{transaction.gateway}</TableCell>
                        <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{transaction.credits}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currencySymbol}{totalRevenue.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total revenue this month</p>
                  {/* Chart component would go here */}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transaction Volume</CardTitle>
                  <CardDescription>Daily transaction counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total transactions this month</p>
                  {/* Chart component would go here */}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gateway Configuration</CardTitle>
                <CardDescription>Configure payment gateway settings and priorities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-medium mb-2">Currency Settings</h3>
                      <Select defaultValue="USD" disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">US Dollar (USD) - Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Payment Gateway</h3>
                      <Select defaultValue="paypal" disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paypal">PayPal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn-primary px-4 py-2">Save Configuration</button>
                    <button className="btn-secondary px-4 py-2">Test All Gateways</button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default PaymentAnalytics;