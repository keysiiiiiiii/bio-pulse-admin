import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Dashboard } from "@/components/admin/Dashboard";
import { LeaveRequests } from "@/components/admin/LeaveRequests";
import { LeaveHistory } from "@/components/admin/LeaveHistory";
import { DailyTimeRecords } from "@/components/admin/DailyTimeRecords";
import { PersonnelList } from "@/components/admin/PersonnelList";
import { AccountSettings } from "@/components/admin/AccountSettings";

type AdminView = "dashboard" | "leave-requests" | "leave-history" | "dtr" | "personnel" | "settings";

const Admin = () => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "leave-requests":
        return <LeaveRequests />;
      case "leave-history":
        return <LeaveHistory />;
      case "dtr":
        return <DailyTimeRecords />;
      case "personnel":
        return <PersonnelList />;
      case "settings":
        return <AccountSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            {renderView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
