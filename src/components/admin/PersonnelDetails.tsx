import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { UserCheck, Calendar, TrendingUp, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PersonnelDetailsProps {
  personnel: {
    id: string;
    staffId: string;
    name: string;
    role: string;
    department: string;
    email: string;
  };
}

const attendanceData = [
  { day: "Mon", status: 100 },
  { day: "Tue", status: 100 },
  { day: "Wed", status: 80 },
  { day: "Thu", status: 100 },
  { day: "Fri", status: 100 },
];

export function PersonnelDetails({ personnel }: PersonnelDetailsProps) {
  const [leaveCredits, setLeaveCredits] = useState({ vacation: 15, sick: 10, emergency: 5 });
  const [editingCredits, setEditingCredits] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [tempCredits, setTempCredits] = useState(leaveCredits);

  const handleSaveCredits = () => {
    setPasswordDialog(true);
  };

  const confirmSaveCredits = () => {
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password to confirm changes",
        variant: "destructive",
      });
      return;
    }

    // TODO: Verify admin password with backend
    setLeaveCredits(tempCredits);
    setEditingCredits(false);
    setPasswordDialog(false);
    setAdminPassword("");
    
    toast({
      title: "Leave Credits Updated",
      description: "Personnel leave credits have been updated successfully",
    });
  };

  const handleSetAsDean = () => {
    // TODO: Integrate with backend API
    toast({
      title: "Dean Status Updated",
      description: `${personnel.name} has been designated as Dean`,
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Staff ID</Label>
              <p className="font-mono">{personnel.staffId}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <Badge variant="outline" className="bg-primary-light text-primary">
                {personnel.role}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p>{personnel.department}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm">{personnel.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Credits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              Leave Credits
            </CardTitle>
            {!editingCredits ? (
              <Button size="sm" onClick={() => {
                setEditingCredits(true);
                setTempCredits(leaveCredits);
              }}>
                Edit Credits
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingCredits(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveCredits}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Vacation Leave</Label>
              {editingCredits ? (
                <Input
                  type="number"
                  value={tempCredits.vacation}
                  onChange={(e) => setTempCredits({ ...tempCredits, vacation: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              ) : (
                <p className="text-2xl font-bold text-primary">{leaveCredits.vacation}</p>
              )}
            </div>
            <div>
              <Label>Sick Leave</Label>
              {editingCredits ? (
                <Input
                  type="number"
                  value={tempCredits.sick}
                  onChange={(e) => setTempCredits({ ...tempCredits, sick: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              ) : (
                <p className="text-2xl font-bold text-secondary">{leaveCredits.sick}</p>
              )}
            </div>
            <div>
              <Label>Emergency Leave</Label>
              {editingCredits ? (
                <Input
                  type="number"
                  value={tempCredits.emergency}
                  onChange={(e) => setTempCredits({ ...tempCredits, emergency: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              ) : (
                <p className="text-2xl font-bold text-accent">{leaveCredits.emergency}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Weekly Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="status" stroke="hsl(var(--success))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Weekly Rate</p>
              <p className="text-xl font-bold text-success">96%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rate</p>
              <p className="text-xl font-bold text-success">94%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tardiness Count</p>
              <p className="text-xl font-bold text-warning">3</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Set as Dean (Faculty Only) */}
      {personnel.role === "Faculty" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Administrative Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Designate this faculty member as Dean for their respective department
            </p>
            <Button onClick={handleSetAsDean} className="bg-gradient-accent hover:opacity-90">
              Set as Dean
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Password Confirmation Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Please enter your admin password to confirm leave credit changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="adminPassword">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialog(false);
              setAdminPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmSaveCredits}>
              Confirm Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
