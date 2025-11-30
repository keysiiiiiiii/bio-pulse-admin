import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FacultySidebar } from "@/components/faculty/FacultySidebar";
import { FacultyHeader } from "@/components/faculty/FacultyHeader";
import { FacultyDashboard } from "@/components/faculty/FacultyDashboard";
import { FacultyDTR } from "@/components/faculty/FacultyDTR";
import { FacultyLeaveForm } from "@/components/faculty/FacultyLeaveForm";
import { FacultySchedule } from "@/components/faculty/FacultySchedule";
import { FacultyNotifications } from "@/components/faculty/FacultyNotifications";
import { FacultyAccountSettings } from "@/components/faculty/FacultyAccountSettings";

type FacultyView = "dashboard" | "dtr" | "leave" | "schedule" | "notifications" | "settings";

const Faculty = () => {
  const [currentView, setCurrentView] = useState<FacultyView>("dashboard");
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
          <FacultySidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            isMobile={mobileSidebarOpen}
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <FacultyHeader 
            currentView={currentView} 
            sidebarCollapsed={sidebarCollapsed}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {currentView === "dashboard" && <FacultyDashboard />}
            {currentView === "dtr" && <FacultyDTR />}
            {currentView === "leave" && <FacultyLeaveForm />}
            {currentView === "schedule" && <FacultySchedule />}
            {currentView === "notifications" && <FacultyNotifications />}
            {currentView === "settings" && <FacultyAccountSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Faculty;
