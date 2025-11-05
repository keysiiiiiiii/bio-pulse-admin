import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Mock ICTO profile data
const ictoProfile = {
  fullName: "Temp Admin",
  userId: "01-2025-0042",
  role: "Admin",
  department: "HR Office",
  email: "temp@ad.co",
  phone: "",
  status: "Active",
  flags: "",
};

export function ProfileInfo() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              TA
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{ictoProfile.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              ID: {ictoProfile.userId} • Role: {ictoProfile.role}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Full Name</h3>
            <p className="text-base">{ictoProfile.fullName}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">User ID</h3>
            <p className="text-base">{ictoProfile.userId}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Role</h3>
            <p className="text-base">{ictoProfile.role}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Department</h3>
            <p className="text-base">{ictoProfile.department}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email</h3>
            <p className="text-base">{ictoProfile.email}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Phone</h3>
            <p className="text-base">{ictoProfile.phone || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Status</h3>
            <p className="text-base">{ictoProfile.status}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Flags</h3>
            <p className="text-base">{ictoProfile.flags || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
