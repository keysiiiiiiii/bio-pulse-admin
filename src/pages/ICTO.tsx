import { useState } from "react";
import { ICTOSidebar } from "@/components/icto/ICTOSidebar";
import { ICTOHeader } from "@/components/icto/ICTOHeader";
import { UserList } from "@/components/icto/UserList";
import { ProfileInfo } from "@/components/icto/ProfileInfo";
import { ActivityHistory } from "@/components/icto/ActivityHistory";
import { AccountTools } from "@/components/icto/AccountTools";
import { ICTOAccountSettings } from "@/components/icto/ICTOAccountSettings";
import { SidebarProvider } from "@/components/ui/sidebar";

type ICTOView = "profile" | "activity" | "tools" | "settings";

const ICTO = () => {
  const [currentView, setCurrentView] = useState<ICTOView>("profile");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <ICTOSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <ICTOHeader />
          <main className="flex-1 p-6">
            {currentView === "settings" ? (
              <ICTOAccountSettings />
            ) : (
              <div className="flex gap-6 h-full">
                {/* Left Side - User List */}
                <UserList 
                  selectedUser={selectedUser}
                  onSelectUser={setSelectedUser}
                />
                
                {/* Right Side - View Content */}
                <div className="flex-1 min-w-0">
                  {currentView === "profile" && <ProfileInfo selectedUser={selectedUser} />}
                  {currentView === "activity" && <ActivityHistory />}
                  {currentView === "tools" && <AccountTools selectedUser={selectedUser} />}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ICTO;
