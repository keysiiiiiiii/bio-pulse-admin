import { User, History, Settings, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

type ICTOView = "profile" | "activity" | "tools";

interface ICTOSidebarProps {
  currentView: ICTOView;
  onViewChange: (view: ICTOView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems: { id: ICTOView; label: string; icon: any }[] = [
  { id: "profile", label: "Profile Info", icon: User },
  { id: "activity", label: "Activity History", icon: History },
  { id: "tools", label: "Account Tools", icon: Settings },
];

export function ICTOSidebar({ currentView, onViewChange, collapsed, onToggleCollapse }: ICTOSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "IC";

  return (
    <Sidebar className={`border-r border-sidebar-border bg-sidebar transition-all ${collapsed ? 'w-16' : ''}`}>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-sidebar-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 border-2 border-sidebar-primary">
              <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sidebar-foreground truncate">{user?.name || "ICTO Admin"}</p>
              <p className="text-sm text-sidebar-foreground/70 truncate">Role: {user?.role || "ICTO"}</p>
              <p className="text-xs text-sidebar-foreground/60">ID: {user?.staff_id || "N/A"}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <Avatar className="h-10 w-10 border-2 border-sidebar-primary mx-auto">
            <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
