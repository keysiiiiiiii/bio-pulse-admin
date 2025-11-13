import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
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
  staff_user_id: string;
  created_at: string;
}

const getActivityBadge = (type: string) => {
  switch (type) {
    case "create":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Create Account</Badge>;
    case "password_reset":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">Password Reset</Badge>;
    case "password_change":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">Password Change</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const formatActivityDetails = (activity: Activity) => {
  const details = activity.details || {};
  const actorInfo = activity.actor_staff_id 
    ? `by ${activity.actor_role || 'User'} (${activity.actor_staff_id})`
    : '';

  switch (activity.action) {
    case "create":
      return `Account created (role: ${details.role || 'N/A'}, dept: ${details.dept || 'N/A'}) ${actorInfo}`;
    case "password_reset":
      const reason = details.reason || 'reset_to_default';
      return `Password ${reason === 'reset_to_default' ? 'reset to default' : 'changed'} ${actorInfo}`;
    case "password_change":
      return `Password changed ${actorInfo}`;
    default:
      return `${activity.action} ${actorInfo}`;
  }
};

export function ActivityHistory() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [user]);

  const fetchActivities = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('account_activity')
        .select('*')
        .eq('staff_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "Failed to load activity history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track all account management actions performed by ICTO
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No activity history found
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      {getActivityBadge(activity.action)}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-sm text-foreground">
                    {formatActivityDetails(activity)}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
