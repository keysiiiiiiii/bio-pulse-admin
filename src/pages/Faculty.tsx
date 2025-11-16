import { useState } from "react";
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <FacultySidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <FacultyHeader currentView={currentView} sidebarCollapsed={sidebarCollapsed} />
          <main className="flex-1 p-6 overflow-auto">
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
