import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock activity data
const activities = [
  {
    id: 1,
    timestamp: "10/21/2025, 11:57:35 AM",
    type: "password_change",
    details: "Password changed by Admin (01-2025-0042)",
  },
  {
    id: 2,
    timestamp: "10/21/2025, 11:56:10 AM",
    type: "password_reset",
    details: "Password reset to default by ICTO (66-2025-0004)",
  },
  {
    id: 3,
    timestamp: "10/7/2025, 6:12:12 PM",
    type: "create",
    details: "Account created (role: Admin, dept: HR Office) by ICTO (66-2025-0004)",
  },
  {
    id: 4,
    timestamp: "10/5/2025, 3:45:20 PM",
    type: "password_reset",
    details: "Password reset to default for user (15-2025-0026)",
  },
  {
    id: 5,
    timestamp: "10/3/2025, 10:30:15 AM",
    type: "create",
    details: "Account created (role: Faculty, dept: College of Engineering) by ICTO (01-2025-0042)",
  },
];

const getActivityBadge = (type: string) => {
  switch (type) {
    case "password_change":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">Password Change</Badge>;
    case "password_reset":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">Password Reset</Badge>;
    case "create":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Create Account</Badge>;
    default:
      return <Badge variant="outline">Action</Badge>;
  }
};

export function ActivityHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track all account management actions performed by ICTO
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border-l-2 border-primary/20 pl-4 pb-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    {getActivityBadge(activity.type)}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.timestamp}
                  </time>
                </div>
                <p className="text-sm text-foreground">{activity.details}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
