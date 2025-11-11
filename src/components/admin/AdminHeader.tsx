import { SidebarTrigger } from "@/components/ui/sidebar";
import { AdminNotifications } from "./AdminNotifications";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-card flex items-center px-6 gap-4 shadow-sm">
      <SidebarTrigger className="hover:bg-muted" />
      
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-foreground">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Universidad de Manila - HR Management</p>
      </div>

      <AdminNotifications />
    </header>
  );
}
