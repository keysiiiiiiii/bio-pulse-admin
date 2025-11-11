import { User, History, Settings, LogOut, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

type ICTOView = "profile" | "activity" | "tools" | "settings";

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
  { id: "settings", label: "Account Settings", icon: UserCog },
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
            <p className="font-semibold text-white truncate">{user?.name || "ICTO Admin"}</p>
            <p className="text-sm text-white/70 truncate">{user?.role || "ICTO"}</p>
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
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className="hover:bg-[#5CB85C] hover:text-white"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
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
}
