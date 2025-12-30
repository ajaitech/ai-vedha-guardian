import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenubutton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Mail,
  Receipt,
  Settings,
  HeadphonesIcon,
  FileCode,
  Shield,
  BarChart3,
  Globe,
  Ticket,
  MessageSquare,
  Zap,
  Database,
  AlertTriangle
} from 'lucide-react';

const adminMenuItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "System Health", url: "/admin/system-health", icon: Zap },
    ]
  },
  {
    title: "User Management",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Admin Roles", url: "/admin/roles", icon: Shield },
      { title: "Access Logs", url: "/admin/access-logs", icon: Database },
    ]
  },
  {
    title: "Payments & Credits",
    items: [
      { title: "Payment Analytics", url: "/admin/payments", icon: CreditCard },
      { title: "Gateway Config", url: "/admin/payment-gateways", icon: Settings },
      { title: "Coupons", url: "/admin/coupons", icon: Ticket },
      { title: "Receipts", url: "/admin/receipts", icon: Receipt },
    ]
  },
  {
    title: "Security Audits",
    items: [
      { title: "Audit Queue", url: "/admin/audit-queue", icon: AlertTriangle },
      { title: "Lambda Editor", url: "/admin/lambda-editor", icon: FileCode },
      { title: "Scan Results", url: "/admin/scan-results", icon: Shield },
    ]
  },
  {
    title: "Communications",
    items: [
      { title: "Email Templates", url: "/admin/email-templates", icon: Mail },
      { title: "Email Settings", url: "/admin/email-settings", icon: Settings },
      { title: "SMS & WhatsApp", url: "/admin/sms-whatsapp", icon: MessageSquare },
      { title: "Support Tickets", url: "/admin/support-tickets", icon: HeadphonesIcon },
    ]
  },
  {
    title: "Content & Site",
    items: [
      { title: "CMS Pages", url: "/admin/cms", icon: Globe },
      { title: "PDF Templates", url: "/admin/pdf-templates", icon: FileCode },
    ]
  }
];

export function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isGroupActive = (items: { url: string }[]) => items.some(item => isActive(item.url));

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center w-full text-left transition-colors ${
      isActive 
        ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary' 
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  return (
    <Sidebar className="w-64">
      <SidebarContent className="border-r">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Aivedha Admin</h2>
              <p className="text-xs text-muted-foreground">Security Control Center</p>
            </div>
          </div>
        </div>

        {adminMenuItems.map((section, sectionIndex) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenubutton asChild className="p-0">
                      <NavLink 
                        to={item.url} 
                        className={getNavClassName}
                      >
                        <div className="flex items-center px-3 py-2 w-full">
                          <item.icon className="h-4 w-4 mr-3" />
                          <span className="text-sm">{item.title}</span>
                        </div>
                      </NavLink>
                    </SidebarMenubutton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}