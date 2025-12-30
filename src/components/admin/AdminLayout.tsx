import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenubutton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import {
  Users,
  CreditCard,
  Shield,
  Settings,
  FileText,
  Mail,
  LogOut,
  Home,
  HeadphonesIcon,
  Receipt
} from 'lucide-react';
import AdminGuard from './AdminGuard';

// Admin API base URL
const ADMIN_API_URL = import.meta.env.PROD
  ? 'https://admin-api.aivedha.ai'
  : 'https://admin-api.aivedha.ai';

const AdminLayoutContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const clearAdminSession = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');

    // Call logout endpoint
    if (token) {
      try {
        await fetch(`${ADMIN_API_URL}/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      } catch (err) {
        // Ignore logout errors
      }
    }

    clearAdminSession();
    navigate('/admin/login');
  };

  const menuItems = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: Home,
      group: "Main"
    },
    {
      title: "User Management",
      url: "/admin/users",
      icon: Users,
      group: "Management"
    },
    {
      title: "Payment Analytics",
      url: "/admin/payments",
      icon: CreditCard,
      group: "Management"
    },
    {
      title: "Billing Management",
      url: "/admin/billing",
      icon: Receipt,
      group: "Management"
    },
    {
      title: "Support Tickets",
      url: "/admin/support-tickets",
      icon: HeadphonesIcon,
      group: "Support"
    },
    {
      title: "Email Templates",
      url: "/admin/email-templates",
      icon: Mail,
      group: "Support"
    },
    {
      title: "Email Settings",
      url: "/admin/email-settings",
      icon: Settings,
      group: "Support"
    },
    {
      title: "Receipts",
      url: "/admin/receipts",
      icon: FileText,
      group: "Support"
    },
    {
      title: "System Settings",
      url: "/admin/settings",
      icon: Settings,
      group: "Configuration"
    },
  ];

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const isActive = (path: string) => location.pathname === path;

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarContent>
            {/* Admin Header */}
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="font-bold text-sm">Aivedha Admin</h2>
                  <p className="text-xs text-muted-foreground">{adminUser.name}</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            {Object.entries(groupedMenuItems).map(([group, items]) => (
              <SidebarGroup key={group}>
                <SidebarGroupLabel>{group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenubutton 
                          asChild
                          className={isActive(item.url) ? "bg-primary/10 text-primary" : ""}
                        >
                          <button
                            onClick={() => navigate(item.url)}
                            className="flex items-center space-x-2 w-full"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </button>
                        </SidebarMenubutton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {/* Logout */}
            <div className="mt-auto p-4 border-t">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger />
              <div className="ml-auto flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {adminUser.role} • {adminUser.location}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// Wrap the layout with AdminGuard for security
const AdminLayout: React.FC = () => {
  return (
    <AdminGuard>
      <AdminLayoutContent />
    </AdminGuard>
  );
};

export default AdminLayout;