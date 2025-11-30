import { useState, useEffect } from "react";
import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import { StaffDTR } from "@/components/staff/StaffDTR";
import { StaffLeaveForm } from "@/components/staff/StaffLeaveForm";
import { StaffSchedule } from "@/components/staff/StaffSchedule";
import { StaffNotifications } from "@/components/staff/StaffNotifications";
import { StaffAccountSettings } from "@/components/staff/StaffAccountSettings";
import { SidebarProvider } from "@/components/ui/sidebar";

type StaffView = "dashboard" | "dtr" | "leave" | "schedule" | "notifications" | "settings";

const Staff = () => {
  const [currentView, setCurrentView] = useState<StaffView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar when view changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentView]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - Hidden on mobile by default, shown when mobileSidebarOpen */}
        <div className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <StaffSidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            isMobile={mobileSidebarOpen}
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <StaffHeader 
            currentView={currentView} 
            sidebarCollapsed={sidebarCollapsed}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {currentView === "dashboard" && <StaffDashboard />}
            {currentView === "dtr" && <StaffDTR />}
            {currentView === "leave" && <StaffLeaveForm />}
            {currentView === "schedule" && <StaffSchedule />}
            {currentView === "notifications" && <StaffNotifications />}
            {currentView === "settings" && <StaffAccountSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Staff;
