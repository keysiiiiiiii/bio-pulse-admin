// src/components/AdminSidebar.tsx
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  History,
  Clock,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
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

type AdminView =
  | "dashboard"
  | "analytics"
  | "leave-requests"
  | "leave-history"
  | "dtr"
  | "personnel"
  | "settings";

interface AdminSidebarProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
}

const menuItems: { id: AdminView; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "leave-requests", label: "Leave Requests", icon: FileText },
  { id: "leave-history", label: "Leave History", icon: History },
  { id: "dtr", label: "Daily Time Records", icon: Clock },
  { id: "personnel", label: "Personnel List", icon: Users },
  { id: "settings", label: "Account Settings", icon: Settings },
];

export function AdminSidebar({ currentView, onViewChange }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Compute initials if avatarUrl/photo_url is missing
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  return (
    <Sidebar className="border-r border-[#38A169]/30 bg-[#38A169] text-[#F0FFF4]">
      {/* ===== Header with dynamic user info ===== */}
      <SidebarHeader className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage
              src={user?.photo_url || user?.avatarUrl || ""}
              alt={user?.name}
            />
            <AvatarFallback className="bg-[#5CB85C] text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">
              {user?.name || "Admin User"}
            </p>
            <p className="text-sm text-white/70 truncate">
              {user?.role || "Admin"}
            </p>
            <p className="text-xs text-white/60">
              ID: {user?.staff_id || "N/A"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ===== Menu ===== */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/70">
            Navigation
          </SidebarGroupLabel>
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

      {/* ===== Footer with Logout ===== */}
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

export default AdminSidebar;
