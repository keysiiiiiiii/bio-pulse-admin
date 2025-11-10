import { Menu, LayoutDashboard, FileText, FilePlus, Bell, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

type StaffView = "dashboard" | "dtr" | "leave" | "notifications" | "settings";

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
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className={collapsed ? "p-2" : "p-6"}>
        <div className="flex items-center gap-3 border-b pb-4">
          {!collapsed && (
            <>
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user?.name || "Staff"}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.role || "Staff"}</p>
                <p className="text-xs text-muted-foreground">ID: {user?.staff_id || "N/A"}</p>
              </div>
            </>
          )}
          {collapsed && (
            <Avatar className="h-10 w-10 border-2 border-primary mx-auto">
              <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className={collapsed ? "py-2" : "pt-4"}>
          <button onClick={onToggleCollapse} className="w-full flex items-center justify-center p-2 hover:bg-accent rounded-md">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.view)}
                    isActive={currentView === item.view}
                    className={currentView === item.view ? "bg-accent text-accent-foreground" : ""}
                  >
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
