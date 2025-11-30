import { LayoutDashboard, FileText, FilePlus, Bell, Settings, LogOut, Calendar, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

type StaffView = "dashboard" | "dtr" | "leave" | "schedule" | "notifications" | "settings";

interface StaffSidebarProps {
  currentView: StaffView;
  onViewChange: (view: StaffView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export const StaffSidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse, onCloseMobile, isMobile }: StaffSidebarProps) => {
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

  const handleMenuClick = (view: StaffView) => {
    onViewChange(view);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "SM";

  return (
    <Sidebar 
      className="border-r border-[#38A169]/30 bg-[#38A169] text-[#F0FFF4] h-full" 
      collapsible="icon"
      onClick={(e) => e.stopPropagation()}
    >
      <SidebarHeader className="p-4 md:p-6 border-b border-white/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 md:h-16 md:w-16 border-2 border-white flex-shrink-0">
              <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
              <AvatarFallback className="bg-[#5CB85C] text-white font-semibold text-lg md:text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate text-sm md:text-base">{user?.name || "Staff"}</p>
              <p className="text-xs md:text-sm text-white/70 truncate">{user?.role || "Staff"}</p>
              <p className="text-xs text-white/60">ID: {user?.staff_id || "N/A"}</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white hover:bg-white/20 flex-shrink-0"
              onClick={onCloseMobile}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70 px-4">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item.view)}
                    isActive={currentView === item.view}
                    className="hover:bg-[#5CB85C] hover:text-white min-h-[44px] px-4"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm md:text-base">{item.title}</span>
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
              className="hover:bg-[#5CB85C] hover:text-white min-h-[44px] px-4"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm md:text-base">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
