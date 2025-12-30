import React, { useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  CreditCard, 
  Shield, 
  Mail,
  UserPlus,
  MoreHorizontal
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  totalAudits: number;
  registrationDate: string;
  lastLogin: string;
  status: 'active' | 'suspended' | 'pending';
  location: string;
  subscription: 'free' | 'premium' | 'enterprise';
}

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Mock user data
  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'john@example.com',
      name: 'John Smith',
      credits: 45,
      totalAudits: 12,
      registrationDate: '2024-01-15',
      lastLogin: '2024-01-20',
      status: 'active',
      location: 'New York, USA',
      subscription: 'premium'
    },
    {
      id: '2',
      email: 'sarah@company.com',
      name: 'Sarah Johnson',
      credits: 120,
      totalAudits: 34,
      registrationDate: '2024-01-10',
      lastLogin: '2024-01-19',
      status: 'active',
      location: 'London, UK',
      subscription: 'enterprise'
    },
    {
      id: '3',
      email: 'mike@startup.io',
      name: 'Mike Chen',
      credits: 8,
      totalAudits: 3,
      registrationDate: '2024-01-18',
      lastLogin: '2024-01-18',
      status: 'pending',
      location: 'Singapore',
      subscription: 'free'
    }
  ]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      suspended: 'destructive',
      pending: 'secondary'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getSubscriptionBadge = (subscription: string) => {
    const variants = {
      free: 'outline',
      premium: 'default',
      enterprise: 'secondary'
    } as const;
    return <Badge variant={variants[subscription as keyof typeof variants]}>{subscription}</Badge>;
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
  };

  const handleAddCredits = (userId: string, amount: number) => {
    // Add credits logic here
    logger.log(`Adding ${amount} credits to user ${userId}`);
  };

  const handleSendEmail = (userEmail: string) => {
    // Send email logic here
    logger.log(`Sending email to ${userEmail}`);
  };

  const handleSuspendUser = (userId: string) => {
    // Suspend user logic here
    logger.log(`Suspending user ${userId}`);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users, credits, and permissions</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <button className="btn-primary px-4 py-2 rounded-xl inline-flex items-center">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="credits">Initial Credits</Label>
                  <Input id="credits" type="number" />
                </div>
                <div className="flex space-x-2">
                  <button className="btn-primary flex-1">Create User</button>
                  <button className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <button className="btn-secondary px-3 py-2">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </button>
                <button className="btn-secondary px-3 py-2">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.reduce((sum, user) => sum + user.credits, 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.reduce((sum, user) => sum + user.totalAudits, 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Audits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">{user.location}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{user.credits}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddCredits(user.id, 10)}
                        >
                          <CreditCard className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{user.totalAudits}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{getSubscriptionBadge(user.subscription)}</TableCell>
                    <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendEmail(user.email)}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspendUser(user.id)}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
};

export default UserManagement;