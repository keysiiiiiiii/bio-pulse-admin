import { Menu, LayoutDashboard, FileText, FilePlus, Bell, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type FacultyView = "dashboard" | "dtr" | "leave" | "notifications" | "settings";

interface FacultySidebarProps {
  currentView: FacultyView;
  onViewChange: (view: FacultyView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const FacultySidebar = ({ currentView, onViewChange, collapsed, onToggleCollapse }: FacultySidebarProps) => {
  const navigate = useNavigate();

  const menuItems: { title: string; view: FacultyView; icon: typeof LayoutDashboard }[] = [
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
      <SidebarHeader className={collapsed ? "p-2" : "p-6"}>
        <div className="flex items-center gap-3 border-b pb-4">
          {!collapsed && (
            <>
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">John Doe</p>
                <p className="text-sm text-muted-foreground truncate">Faculty</p>
                <p className="text-xs text-muted-foreground">ID: 23-2025-1001</p>
              </div>
            </>
          )}
          {collapsed && (
            <Avatar className="h-8 w-8 border-2 border-primary mx-auto">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                JD
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
