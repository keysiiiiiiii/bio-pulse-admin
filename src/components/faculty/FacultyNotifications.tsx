import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle2, Clock, XCircle, AlertCircle, LogIn, LogOut, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Activity {
  id: number;
  action: string;
  details: any;
  actor_staff_id: string;
  actor_role: string;
  staff_id: string;
  created_at: string;
}

const getActivityIcon = (action: string, details?: any) => {
  switch (action) {
    case 'leave_request_created':
      return Clock;
    case 'leave_status_update':
      const status = details?.status || '';
      return status === 'approved' ? CheckCircle2 : XCircle;
    case 'leave_credits_updated':
    case 'leave_credits_eligible':
      return CheckCircle2;
    case 'account_info_updated':
      return AlertCircle;
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
  switch(action) {
    case 'leave_request_created':
      return 'Leave Request Submitted';
    case 'leave_status_update':
      const status = details?.status || '';
      if (status === 'approved') return 'Leave Request Approved';
      if (status === 'disapproved') return 'Leave Request Disapproved';
      return 'Leave Request Updated';
    case 'leave_credits_updated':
      return 'Leave Credits Updated';
    case 'leave_credits_eligible':
      return 'Leave Credits Eligibility';
    case 'account_info_updated':
      return 'Account Information Updated';
    case 'attendance_time_in':
      return 'Time In Recorded';
    case 'attendance_time_out':
      return 'Time Out Recorded';
    case 'password_change':
      return 'Password Changed';
    case 'password_reset':
      return 'Password Reset';
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const formatActivityMessage = (action: string, details: any) => {
  if (action === 'leave_request_created') {
    const leaveType = details?.leave_type || 'leave';
    const startDate = details?.start_date || '';
    const endDate = details?.end_date || '';
    return `You submitted a ${leaveType} leave request from ${startDate} to ${endDate}`;
  }
  
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
  
  if (action === 'leave_credits_updated') {
    const creditType = details?.credit_type || 'leave credits';
    const amount = details?.amount || '';
    return `Your ${creditType} balance was updated: ${amount} days`;
  }
  
  if (action === 'leave_credits_eligible') {
    return 'You are now eligible for leave credits';
  }
  
  if (action === 'account_info_updated') {
    const field = details?.field || 'information';
    return `Your ${field} was successfully updated`;
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
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user?.staff_id) {
      fetchActivities();
    }
  }, [user?.staff_id, token]);

  const fetchActivities = async () => {
    if (!user?.staff_id) {
      setLoading(false);
      return;
    }

    try {
      const staffId = user.staff_id;
      console.log('Fetching Faculty notifications for:', staffId);
      
      const { data, error } = await supabase
        .from('account_activity')
        .select('*')
        .or(`actor_staff_id.eq.${staffId},staff_id.eq.${staffId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched activities:', data);
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

  // Filter activities based on selected filter
  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    if (filter === "leave") return activity.action === "leave_status_update";
    if (filter === "attendance") return activity.action === "attendance_time_in" || activity.action === "attendance_time_out";
    if (filter === "account") return activity.action === "password_change" || activity.action === "password_reset";
    if (filter === "credits") return activity.action?.includes("leave_credit") || activity.action?.includes("eligible");
    return true;
  });

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

      {/* Filter Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="leave">Leave Updates</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="account">Account Settings</SelectItem>
            <SelectItem value="credits">Leave Credits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
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
          filteredActivities.map((activity) => {
            const Icon = getActivityIcon(activity.action, activity.details);
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