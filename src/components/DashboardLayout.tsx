import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  tabs: { label: string; value: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, tabs, activeTab, onTabChange }) => {
  const { signOut, instituteCode } = useAuth();
  const navigate = useNavigate();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutPopup(true);
  };

  const handleYes = async () => {
    setShowLogoutPopup(false);
    await signOut();
    navigate('/');
  };

  const handleNo = () => {
    setShowLogoutPopup(false);
    window.open('https://forms.gle/3PsfR181KFEMnXkB7', '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">{title}</h1>
              {instituteCode && (
                <p className="text-xs text-muted-foreground">Institute ID: {instituteCode}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://forms.gle/3PsfR181KFEMnXkB7" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-1" /> Feedback
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogoutClick}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      <Dialog open={showLogoutPopup} onOpenChange={setShowLogoutPopup}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Did everything work fine today?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" onClick={handleYes} className="min-w-24">
              👍 Yes
            </Button>
            <Button size="lg" variant="outline" onClick={handleNo} className="min-w-24">
              👎 No
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;
