import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle2, Clock, XCircle, AlertCircle, LogIn, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
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

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'leave_status_update':
      const status = action.includes('approved') ? 'approved' : 'disapproved';
      return status === 'approved' ? CheckCircle2 : XCircle;
    case 'attendance_time_in':
      return LogIn;
    case 'attendance_time_out':
      return LogOut;
    default:
      return Bell;
  }
};

const getActivityColor = (action: string, details: any) => {
  if (action === 'leave_status_update') {
    const status = details?.status || '';
    if (status === 'approved') return 'text-success';
    if (status === 'disapproved') return 'text-destructive';
    return 'text-warning';
  }
  if (action === 'attendance_time_in' || action === 'attendance_time_out') {
    return 'text-primary';
  }
  return 'text-muted-foreground';
};

const formatActivityTitle = (action: string, details: any) => {
  if (action === 'leave_status_update') {
    const status = details?.status || '';
    if (status === 'approved') return 'Leave Request Approved';
    if (status === 'disapproved') return 'Leave Request Disapproved';
    return 'Leave Request Updated';
  }
  if (action === 'attendance_time_in') return 'Time In Recorded';
  if (action === 'attendance_time_out') return 'Time Out Recorded';
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatActivityMessage = (action: string, details: any) => {
  if (action === 'leave_status_update') {
    const leaveType = details?.leave_type || 'leave';
    const status = details?.status || '';
    const remarks = details?.remarks;
    
    if (status === 'approved') {
      return `Your ${leaveType} leave request has been approved`;
    }
    if (status === 'disapproved') {
      return remarks ? `Disapproved: ${remarks}` : `Your ${leaveType} leave request was not approved`;
    }
    return `Your ${leaveType} leave status was updated to ${status}`;
  }
  
  if (action === 'attendance_time_in') {
    const time = details?.time_in ? new Date(details.time_in).toLocaleTimeString() : '';
    return `You clocked in at ${time}`;
  }
  
  if (action === 'attendance_time_out') {
    const time = details?.time_out ? new Date(details.time_out).toLocaleTimeString() : '';
    return `You clocked out at ${time}`;
  }
  
  return JSON.stringify(details || {});
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const StaffNotifications = () => {
  const { user, token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [user, token]);

  const fetchActivities = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activity_history')
        .select('*')
        .eq('staff_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">Stay updated with your leave requests and attendance</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Notifications</h2>
        <p className="text-muted-foreground">Stay updated with your leave requests and attendance</p>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.action);
            const iconColor = getActivityColor(activity.action, activity.details);
            const title = formatActivityTitle(activity.action, activity.details);
            const message = formatActivityMessage(activity.action, activity.details);
            const time = formatTime(activity.created_at);

            return (
              <Card key={activity.id}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`mt-1 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{title}</h3>
                      <span className="text-xs text-muted-foreground">{time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{message}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
