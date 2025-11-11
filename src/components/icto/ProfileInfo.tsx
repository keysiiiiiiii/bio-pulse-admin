import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileInfoProps {
  selectedUser: any;
}

export function ProfileInfo({ selectedUser }: ProfileInfoProps) {
  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Select a user from the list to view their profile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const initials = selectedUser?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={selectedUser?.photo_url || selectedUser?.avatarUrl || ""} alt={selectedUser?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{selectedUser?.name || "N/A"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              ID: {selectedUser?.staff_id || "N/A"} • Role: {selectedUser?.role || "N/A"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Full Name</h3>
            <p className="text-base">{selectedUser?.name || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Staff ID</h3>
            <p className="text-base">{selectedUser?.staff_id || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Role</h3>
            <p className="text-base">{selectedUser?.role || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Department</h3>
            <p className="text-base">{selectedUser?.department || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email</h3>
            <p className="text-base">{selectedUser?.email || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Phone</h3>
            <p className="text-base">{selectedUser?.contact_number || "—"}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">Employee Type</h3>
            <p className="text-base">{selectedUser?.employee_type || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
