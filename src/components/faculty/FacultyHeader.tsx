import { GraduationCap } from "lucide-react";

interface FacultyHeaderProps {
  currentView?: string;
  sidebarCollapsed?: boolean;
}

export const FacultyHeader = ({ currentView, sidebarCollapsed }: FacultyHeaderProps) => {
  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "dtr":
        return "Daily Time Record";
      case "leave":
        return "Leave Form";
      case "notifications":
        return "Notifications";
      case "settings":
        return "Account Settings";
      default:
        return "Dashboard";
    }
  };

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10 transition-all duration-300">
      <div className={`px-6 py-4 flex items-center gap-3 transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
        <GraduationCap className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Universidad de Manila</h1>
          <p className="text-sm text-muted-foreground">Faculty - {getViewTitle()}</p>
        </div>
      </div>
    </header>
  );
};
