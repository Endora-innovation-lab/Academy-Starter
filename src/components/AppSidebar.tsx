import { NavLink } from 'react-router-dom';
import { LucideIcon, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import dashboardLogo from '@/assets/logo-transparent.png';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export interface SidebarItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  title: string;
  items: SidebarItem[];
  activeTab: string;
  onTabChange: (v: string) => void;
  userLabel?: string;
  userRoleLabel?: string;
  onLogout: () => void;
}

export function AppSidebar({
  title,
  items,
  activeTab,
  onTabChange,
  userLabel,
  userRoleLabel,
  onLogout,
}: AppSidebarProps) {
  const { instituteCode } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleSelect = (value: string) => {
    onTabChange(value);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={dashboardLogo} alt="Logo" className="h-9 w-9 rounded" />
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{title}</div>
            {instituteCode && (
              <div className="text-[11px] text-muted-foreground truncate">
                {instituteCode}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => handleSelect(item.value)}
                      className={
                        active
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                          : ''
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {userLabel && (
          <div className="px-2 py-2">
            <div className="text-sm font-medium truncate">{userLabel}</div>
            {userRoleLabel && (
              <div className="text-xs text-muted-foreground">{userRoleLabel}</div>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
