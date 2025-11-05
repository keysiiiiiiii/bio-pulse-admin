import { Building2 } from "lucide-react";

interface StaffHeaderProps {
  currentView?: string;
}

export const StaffHeader = ({ currentView }: StaffHeaderProps) => {
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
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Universidad de Manila</h1>
          <p className="text-sm text-muted-foreground">Staff - {getViewTitle()}</p>
        </div>
      </div>
    </header>
  );
};
