import { useState } from "react";
import { ICTOSidebar } from "@/components/icto/ICTOSidebar";
import { ICTOHeader } from "@/components/icto/ICTOHeader";
import { UserList } from "@/components/icto/UserList";
import { ProfileInfo } from "@/components/icto/ProfileInfo";
import { ActivityHistory } from "@/components/icto/ActivityHistory";
import { AccountTools } from "@/components/icto/AccountTools";
import { SidebarProvider } from "@/components/ui/sidebar";

type ICTOView = "profile" | "activity" | "tools";

const ICTO = () => {
  const [currentView, setCurrentView] = useState<ICTOView>("profile");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <ICTOSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col">
          <ICTOHeader />
          <main className="flex-1 flex gap-6 p-6">
            {/* Left Side - User List */}
            <UserList 
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
            />
            
            {/* Right Side - View Content */}
            <div className="flex-1">
              {currentView === "profile" && <ProfileInfo />}
              {currentView === "activity" && <ActivityHistory />}
              {currentView === "tools" && <AccountTools selectedUser={selectedUser} />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ICTO;
