import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/web_logo.png";

interface StaffHeaderProps {
  currentView?: string;
  sidebarCollapsed?: boolean;
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export const StaffHeader = ({ currentView, sidebarCollapsed, onMenuClick, isMobile }: StaffHeaderProps) => {
  const { user } = useAuth();
  
  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "dtr":
        return "Daily Time Record";
      case "leave":
        return "Leave Form";
      case "schedule":
        return "Schedule";
      case "notifications":
        return "Notifications";
      case "settings":
        return "Account Settings";
      default:
        return "Dashboard";
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "SM";

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10 transition-all duration-300">
      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
        {/* Mobile Menu Button - Always visible on mobile via CSS */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden min-h-[44px] min-w-[44px]"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <img src={logo} alt="UDM Logo" className="h-8 w-8" />
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
            <span className="md:hidden">UDM</span>
            <span className="hidden md:inline">Universidad de Manila</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            Staff - {getViewTitle()}
          </p>
        </div>

        {/* Mobile Profile Avatar - Always visible on mobile via CSS */}
        <Avatar className="h-9 w-9 border border-border md:hidden">
          <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
