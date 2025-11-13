import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface Activity {
  id: number;
  action: string;
  details: any;
  actor_staff_id: string;
  actor_role: string;
  staff_id: string;
  created_at: string;
}

export function AdminNotifications() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  const fetchActivities = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/recent?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatActivityText = (activity: Activity): string => {
    const { action, details } = activity;
    
    if (action === 'leave_status_update') {
      const status = details?.status || '';
      const leaveType = details?.leave_type || 'leave';
      return `Leave request (${leaveType}) updated to ${status}`;
    }
    
    if (action === 'attendance_time_in') {
      return `Attendance time-in recorded for ${activity.staff_id}`;
    }
    
    if (action === 'attendance_time_out') {
      return `Attendance time-out recorded for ${activity.staff_id}`;
    }
    
    if (action === 'create') {
      return `Account created: ${details?.role || 'N/A'}`;
    }
    
    if (action === 'password_reset') {
      return `Password reset performed`;
    }
    
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {activities.length > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground">
            {activities.length > 9 ? "9+" : activities.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-96 z-50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No recent activity
                  </div>
                ) : (
                  <div className="divide-y">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {formatActivityText(activity)}
                            </p>
                            {activity.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.staff_id && `Staff: ${activity.staff_id}`}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
