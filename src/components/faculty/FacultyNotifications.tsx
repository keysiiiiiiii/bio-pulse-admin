import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Clock, XCircle } from "lucide-react";

const mockNotifications = [
  {
    id: 1,
    type: "approved",
    title: "Leave Request Approved",
    message: "Your vacation leave from Nov 10-15 has been approved",
    time: "2 hours ago",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
  {
    id: 2,
    type: "pending",
    title: "Leave Request Pending",
    message: "Your sick leave request is awaiting approval",
    time: "1 day ago",
    icon: Clock,
    iconColor: "text-warning",
  },
  {
    id: 3,
    type: "rejected",
    title: "Leave Request Disapproved",
    message: "Your emergency leave request was not approved. Reason: Insufficient documentation",
    time: "3 days ago",
    icon: XCircle,
    iconColor: "text-destructive",
  },
  {
    id: 4,
    type: "info",
    title: "DTR Reminder",
    message: "Don't forget to check your Daily Time Record for October",
    time: "1 week ago",
    icon: Bell,
    iconColor: "text-primary",
  },
];

export const FacultyNotifications = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Notifications</h2>
        <p className="text-muted-foreground">Stay updated with your leave requests and announcements</p>
      </div>

      <div className="space-y-4">
        {mockNotifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card key={notification.id}>
              <CardContent className="flex items-start gap-4 p-6">
                <div className={`mt-1 ${notification.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
