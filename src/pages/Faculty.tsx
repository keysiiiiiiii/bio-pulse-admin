import { useState } from "react";
import { FacultySidebar } from "@/components/faculty/FacultySidebar";
import { FacultyHeader } from "@/components/faculty/FacultyHeader";
import { FacultyDashboard } from "@/components/faculty/FacultyDashboard";
import { FacultyDTR } from "@/components/faculty/FacultyDTR";
import { FacultyLeaveForm } from "@/components/faculty/FacultyLeaveForm";
import { FacultyNotifications } from "@/components/faculty/FacultyNotifications";
import { FacultyAccountSettings } from "@/components/faculty/FacultyAccountSettings";
import { SidebarProvider } from "@/components/ui/sidebar";

type FacultyView = "dashboard" | "dtr" | "leave" | "notifications" | "settings";

const Faculty = () => {
  const [currentView, setCurrentView] = useState<FacultyView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <FacultySidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col">
          <FacultyHeader currentView={currentView} />
          <main className="flex-1 p-6 overflow-auto">
            {currentView === "dashboard" && <FacultyDashboard />}
            {currentView === "dtr" && <FacultyDTR />}
            {currentView === "leave" && <FacultyLeaveForm />}
            {currentView === "notifications" && <FacultyNotifications />}
            {currentView === "settings" && <FacultyAccountSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Faculty;
