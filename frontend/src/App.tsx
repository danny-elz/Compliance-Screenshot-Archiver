import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navigation } from '@/components/layout/Navigation';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SchedulesList } from '@/components/schedules/SchedulesList';
import { ScheduleForm } from '@/components/schedules/ScheduleForm';
import { CapturesList } from '@/components/captures/CapturesList';
import { CaptureVerificationModal } from '@/components/captures/CaptureVerificationModal';
import { OnDemandCapture } from '@/components/captures/OnDemandCapture';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Schedule, Capture } from '@/types';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [verifyingCapture, setVerifyingCapture] = useState<Capture | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const handleCreateSchedule = () => {
    setEditingSchedule(undefined);
    setShowScheduleForm(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  const handleScheduleSuccess = () => {
    setShowScheduleForm(false);
    setEditingSchedule(undefined);
  };

  const handleScheduleCancel = () => {
    setShowScheduleForm(false);
    setEditingSchedule(undefined);
  };

  const handleVerifyCapture = (capture: Capture) => {
    setVerifyingCapture(capture);
  };

  const renderContent = () => {
    if (showScheduleForm) {
      return (
        <div className="flex justify-center">
          <ScheduleForm
            schedule={editingSchedule}
            onSuccess={handleScheduleSuccess}
            onCancel={handleScheduleCancel}
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'schedules':
        return (
          <SchedulesList
            onCreateSchedule={handleCreateSchedule}
            onEditSchedule={handleEditSchedule}
          />
        );
      case 'captures':
        return <CapturesList onVerifyCapture={handleVerifyCapture} />;
      case 'capture':
        return (
          <div className="max-w-2xl mx-auto">
            <OnDemandCapture />
          </div>
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-muted-foreground">Settings page coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    if (showScheduleForm) {
      return editingSchedule ? 'Edit Schedule' : 'Create Schedule';
    }
    
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'schedules':
        return 'Capture Schedules';
      case 'captures':
        return 'Capture Archive';
      case 'capture':
        return 'On-Demand Capture';
      case 'analytics':
        return 'Analytics & Reporting';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const getPageSubtitle = () => {
    if (showScheduleForm) {
      return 'Configure automated webpage captures for compliance archiving';
    }
    
    switch (activeTab) {
      case 'dashboard':
        return 'Overview of your compliance screenshot archiving system';
      case 'schedules':
        return 'Manage automated capture schedules';
      case 'captures':
        return 'Browse and verify your archived captures';
      case 'capture':
        return 'Instantly capture and archive any webpage';
      case 'analytics':
        return 'Archive analytics and compliance reporting';
      case 'settings':
        return 'Configure system settings and preferences';
      default:
        return 'Overview of your compliance screenshot archiving system';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Navigation activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        <Header
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        
        <main className="p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modals */}
      {verifyingCapture && (
        <CaptureVerificationModal
          capture={verifyingCapture}
          onClose={() => setVerifyingCapture(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
