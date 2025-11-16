import { LayoutDashboard, FileText, FilePlus, Bell, Settings, LogOut, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

type StaffView = "dashboard" | "dtr" | "leave" | "schedule" | "notifications" | "settings";

interface StaffSidebarProps {
  currentView: StaffView;
  onViewChange: (view: StaffView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const StaffSidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: StaffSidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems: { title: string; view: StaffView; icon: typeof LayoutDashboard }[] = [
    { title: "Dashboard", view: "dashboard", icon: LayoutDashboard },
    { title: "Daily Time Record", view: "dtr", icon: FileText },
    { title: "Leave Form", view: "leave", icon: FilePlus },
    { title: "Schedule", view: "schedule", icon: Calendar },
    { title: "Notifications", view: "notifications", icon: Bell },
    { title: "Account Settings", view: "settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "SM";

  return (
    <Sidebar className="border-r border-[#38A169]/30 bg-[#38A169] text-[#F0FFF4]" collapsible="icon">
      <SidebarHeader className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 border-2 border-white">
            <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
            <AvatarFallback className="bg-[#5CB85C] text-white font-semibold text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{user?.name || "Staff"}</p>
            <p className="text-sm text-white/70 truncate">{user?.role || "Staff"}</p>
            <p className="text-xs text-white/60">ID: {user?.staff_id || "N/A"}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.view)}
                    isActive={currentView === item.view}
                    className="hover:bg-[#5CB85C] hover:text-white"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="hover:bg-[#5CB85C] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
