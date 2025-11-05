import { Menu, LayoutDashboard, FileText, FilePlus, Bell, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type StaffView = "dashboard" | "dtr" | "leave" | "notifications" | "settings";

interface StaffSidebarProps {
  currentView: StaffView;
  onViewChange: (view: StaffView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const StaffSidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: StaffSidebarProps) => {
  const navigate = useNavigate();

  const menuItems: { title: string; view: StaffView; icon: typeof LayoutDashboard }[] = [
    { title: "Dashboard", view: "dashboard", icon: LayoutDashboard },
    { title: "Daily Time Record", view: "dtr", icon: FileText },
    { title: "Leave Form", view: "leave", icon: FilePlus },
    { title: "Notifications", view: "notifications", icon: Bell },
    { title: "Account Settings", view: "settings", icon: Settings },
  ];

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <div className="p-4 border-b flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

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

        <div className="mt-auto p-4">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
