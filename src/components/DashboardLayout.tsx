import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, LucideIcon, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export interface DashboardTab {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  userLabel?: string;
  userRoleLabel?: string;
  headerLogoutIcon?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  tabs,
  activeTab,
  onTabChange,
  userLabel,
  userRoleLabel,
  headerLogoutIcon,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleYes = async () => {
    setShowLogoutPopup(false);
    await signOut();
    navigate('/');
  };

  const handleNo = () => {
    setShowLogoutPopup(false);
    window.open('https://forms.gle/3PsfR181KFEMnXkB7', '_blank');
  };

  const currentLabel = tabs.find((t) => t.value === activeTab)?.label ?? title;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          title={title}
          items={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          userLabel={userLabel}
          userRoleLabel={userRoleLabel}
          onLogout={() => setShowLogoutPopup(true)}
          hideLogout={headerLogoutIcon}
        />

        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="h-9 w-9" />
                <div className="min-w-0">
                  <h1 className="font-semibold text-base sm:text-lg truncate">{currentLabel}</h1>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://forms.gle/3PsfR181KFEMnXkB7" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Feedback</span>
                  </a>
                </Button>
                {headerLogoutIcon && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Logout"
                    onClick={() => setShowLogoutPopup(true)}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </SidebarInset>

        <Dialog open={showLogoutPopup} onOpenChange={setShowLogoutPopup}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-center">Did everything work fine today?</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center gap-4 pt-4">
              <Button size="lg" onClick={handleYes} className="min-w-24">👍 Yes</Button>
              <Button size="lg" variant="outline" onClick={handleNo} className="min-w-24">👎 No</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
