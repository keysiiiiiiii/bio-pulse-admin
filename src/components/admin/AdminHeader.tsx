import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminHeader() {
  return (
    <header className="h-16 border-b bg-card flex items-center px-6 gap-4 shadow-sm">
      <SidebarTrigger className="hover:bg-muted" />
      
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-foreground">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Universidad de Manila - HR Management</p>
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground">
          3
        </Badge>
      </Button>
    </header>
  );
}
