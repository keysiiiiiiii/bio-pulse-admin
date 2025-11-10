import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

export function ProfileInfo() {
  const { user } = useAuth();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "IC";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={user?.photo_url || user?.avatarUrl || ""} alt={user?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{user?.name || "ICTO Admin"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              ID: {user?.staff_id || "N/A"} • Role: {user?.role || "ICTO"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Full Name</h3>
            <p className="text-base">{user?.name || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Staff ID</h3>
            <p className="text-base">{user?.staff_id || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Role</h3>
            <p className="text-base">{user?.role || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Department</h3>
            <p className="text-base">{user?.department || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email</h3>
            <p className="text-base">{user?.email || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Phone</h3>
            <p className="text-base">{user?.contact_number || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Employee Type</h3>
            <p className="text-base">{user?.employee_type || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
