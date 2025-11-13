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
      return CheckCircle2;
    case 'attendance_time_in':
      return LogIn;
    case 'attendance_time_out':
      return LogOut;
    case 'password_change':
    case 'password_reset':
      return AlertCircle;
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
  if (action === 'password_change') return 'Password Changed';
  if (action === 'password_reset') return 'Password Reset';
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
  
  if (action === 'password_change') {
    return 'Your password was successfully changed';
  }
  
  if (action === 'password_reset') {
    return 'Your password was reset by an administrator';
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

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const FacultyNotifications = () => {
  const { user, token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.staff_id) {
      fetchActivities();
    }
  }, [user?.staff_id, token]);

  const fetchActivities = async () => {
    if (!user?.staff_id) {
      console.log('No staff_id found for user');
      setLoading(false);
      return;
    }

    try {
      console.log('=== NOTIFICATION FETCH DEBUG ===');
      console.log('User object:', user);
      console.log('User staff_id:', user.staff_id);
      console.log('User staff_id type:', typeof user.staff_id);
      console.log('User staff_id length:', user.staff_id?.length);
      console.log('Staff ID trimmed:', `"${user.staff_id?.trim()}"`);
      
      // Try fetching with explicit string conversion and trimming
      const staffId = String(user.staff_id).trim();
      
      // First, let's try to fetch ALL records to see if RLS is the issue
      console.log('Attempting to fetch ALL records first...');
      const { data: allData, error: allError } = await supabase
        .from('account_activity')
        .select('*')
        .limit(5);
      
      console.log('All records sample:', allData);
      console.log('All records error:', allError);
      
      // Now fetch with filter
      console.log('Fetching with staff_id filter:', staffId);
      const { data, error } = await supabase
        .from('account_activity')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error details:', JSON.stringify(error));
        throw error;
      }
      
      console.log('Query executed for staff_id:', staffId);
      console.log('Fetched activities count:', data?.length || 0);
      console.log('Fetched activities:', data);
      
      // If no data, let's try alternative queries
      if (!data || data.length === 0) {
        console.log('No data found, trying actor_staff_id...');
        const { data: actorData, error: actorError } = await supabase
          .from('account_activity')
          .select('*')
          .eq('actor_staff_id', staffId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        console.log('Actor query result:', actorData);
        console.log('Actor query error:', actorError);
        
        if (actorData && actorData.length > 0) {
          console.log('Found data using actor_staff_id instead!');
          setActivities(actorData);
          setLoading(false);
          return;
        }
      }
      
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
                <p className="text-xs text-muted-foreground mt-2">
                  Logged in as: {user?.staff_id}
                </p>
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
                    {activity.actor_staff_id && activity.actor_staff_id !== user?.staff_id && (
                      <p className="text-xs text-muted-foreground">
                        By: {activity.actor_role} ({activity.actor_staff_id})
                      </p>
                    )}
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