import { useState } from "react";
import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import { StaffDTR } from "@/components/staff/StaffDTR";
import { StaffLeaveForm } from "@/components/staff/StaffLeaveForm";
import { StaffNotifications } from "@/components/staff/StaffNotifications";
import { StaffAccountSettings } from "@/components/staff/StaffAccountSettings";
import { SidebarProvider } from "@/components/ui/sidebar";

type StaffView = "dashboard" | "dtr" | "leave" | "notifications" | "settings";

const Staff = () => {
  const [currentView, setCurrentView] = useState<StaffView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <StaffSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <StaffHeader currentView={currentView} />
          <main className="flex-1 p-6 overflow-auto">
            {currentView === "dashboard" && <StaffDashboard />}
            {currentView === "dtr" && <StaffDTR />}
            {currentView === "leave" && <StaffLeaveForm />}
            {currentView === "notifications" && <StaffNotifications />}
            {currentView === "settings" && <StaffAccountSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Staff;
