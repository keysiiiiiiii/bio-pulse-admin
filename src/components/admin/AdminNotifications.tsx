import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, user]);

  const fetchActivities = async () => {
    if (!user?.staff_id) return;
    
    setLoading(true);
    try {
      console.log('Fetching Admin notifications for:', user.staff_id);
      
      const { data, error } = await supabase
        .from('account_activity')
        .select('*')
        .or(`actor_staff_id.eq.${user.staff_id},staff_id.eq.${user.staff_id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      console.log('Fetched activities:', data);
      setActivities(data || []);
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

  const markAsRead = async (activityId: number) => {
    try {
      await supabase
        .from('account_activity')
        .update({ is_read: true })
        .eq('id', activityId);
      
      fetchActivities();
    } catch (error) {
      console.error("Failed to mark as read:", error);
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

  const getActivityColor = (action: string, details: any) => {
    if (action === 'leave_status_update') {
      const status = details?.status || '';
      if (status === 'approved') return 'bg-success/10 text-success';
      if (status === 'disapproved') return 'bg-destructive/10 text-destructive';
      return 'bg-warning/10 text-warning';
    }
    if (action === 'create') return 'bg-success/10 text-success';
    if (action === 'password_reset') return 'bg-warning/10 text-warning';
    if (action === 'leave_credits_updated') return 'bg-primary/10 text-primary';
    if (action === 'attendance_time_in' || action === 'attendance_time_out') return 'bg-info/10 text-info';
    return 'bg-muted/10 text-muted-foreground';
  };

  const formatActivityText = (activity: Activity): string => {
    const { action, details, actor_staff_id, staff_id } = activity;
    const isOwnAction = actor_staff_id === user?.staff_id;
    
    if (action === 'leave_status_update') {
      const status = details?.status || '';
      const leaveType = details?.leave_type || 'leave';
      if (isOwnAction) {
        return `You ${status} ${staff_id}'s ${leaveType} leave request`;
      }
      return `Leave request (${leaveType}) updated to ${status}`;
    }
    
    if (action === 'leave_credits_updated') {
      const amount = details?.amount || '';
      if (isOwnAction) {
        return `You updated leave credits for ${staff_id}: ${amount} days`;
      }
      return `Leave credits updated for ${staff_id}`;
    }
    
    if (action === 'attendance_time_in') {
      return `Attendance time-in recorded for ${staff_id}`;
    }
    
    if (action === 'attendance_time_out') {
      return `Attendance time-out recorded for ${staff_id}`;
    }
    
    if (action === 'create') {
      if (isOwnAction) {
        return `You created account: ${details?.role || 'N/A'}`;
      }
      return `Account created: ${details?.role || 'N/A'}`;
    }
    
    if (action === 'password_reset') {
      if (isOwnAction) {
        return `You reset password for ${staff_id}`;
      }
      return `Password reset performed`;
    }
    
    if (action === 'password_change') {
      return `Your password was changed`;
    }
    
    if (action === 'account_info_updated') {
      const field = details?.field || 'information';
      return `Your ${field} was updated`;
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
                    {activities.map((activity) => {
                      const colorClass = getActivityColor(activity.action, activity.details);
                      return (
                        <div
                          key={activity.id}
                          className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => markAsRead(activity.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${colorClass}`} />
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
                      );
                    })}
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
