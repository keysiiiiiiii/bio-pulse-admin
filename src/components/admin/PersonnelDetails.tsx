import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { UserCheck, Calendar, TrendingUp, Shield, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { scheduleApi } from "@/services/api";
import { ScheduleEditorDialog } from "./ScheduleEditorDialog";

interface PersonnelDetailsProps {
  personnel: {
    id: string;
    staffId: string;
    name: string;
    role: string;
    department: string;
    email: string;
    avatar_url?: string;
    employee_type: string;
  };
  onScheduleUpdate?: () => void;
}

const attendanceData = [
  { day: "Mon", status: 100 },
  { day: "Tue", status: 100 },
  { day: "Wed", status: 80 },
  { day: "Thu", status: 100 },
  { day: "Fri", status: 100 },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PersonnelDetails({ personnel, onScheduleUpdate }: PersonnelDetailsProps) {
  const [leaveCredits, setLeaveCredits] = useState({ vacation: 15, sick: 10, emergency: 5 });
  const [leaveStatus, setLeaveStatus] = useState<'active' | 'inactive'>('inactive');
  const [editingCredits, setEditingCredits] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [deanDialog, setDeanDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [tempCredits, setTempCredits] = useState(leaveCredits);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [personnel.id]);

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const staffUserId = Number(personnel.id);
      if (isNaN(staffUserId)) {
        console.error('Invalid personnel.id:', personnel.id);
        return;
      }
      const response = await scheduleApi.getSchedule(staffUserId);
      setSchedule(response.schedules || []);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleScheduleSuccess = () => {
    fetchSchedule();
    if (onScheduleUpdate) {
      onScheduleUpdate();
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule.find(s => s.day_of_week === dayOfWeek);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const handleToggleLeaveStatus = () => {
    setStatusDialog(true);
  };

  const confirmToggleLeaveStatus = () => {
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password",
        variant: "destructive",
      });
      return;
    }

    // TODO: Verify admin password and update status via API
    setLeaveStatus(leaveStatus === 'active' ? 'inactive' : 'active');
    setStatusDialog(false);
    setAdminPassword("");

    toast({
      title: "Leave Status Updated",
      description: `Leave credits are now ${leaveStatus === 'active' ? 'inactive' : 'active'}`,
    });
  };

  const handleSetAsDean = () => {
    setDeanDialog(true);
  };

  const confirmSetAsDean = () => {
    if (!adminPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your admin password",
        variant: "destructive",
      });
      return;
    }

    // TODO: Verify password and set as dean via API (remove previous dean of this college)
    setDeanDialog(false);
    setAdminPassword("");

    toast({
      title: "Dean Status Updated",
      description: `${personnel.name} has been designated as Dean of ${personnel.department}`,
    });
  };

  return (
    <div className="space-y-6 py-4">
      {/* Profile Picture & Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={personnel.avatar_url} alt={personnel.name} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {getInitials(personnel.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{personnel.name}</h3>
              <p className="text-sm text-muted-foreground">{personnel.staffId}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <Badge variant="outline" className="bg-primary-light text-primary mt-1">
                {personnel.role}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Employee Type</Label>
              <p className="font-medium">{personnel.employee_type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p className="font-medium">{personnel.department}</p>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="leave-status">Status:</Label>
                <Badge variant={leaveStatus === 'active' ? 'default' : 'secondary'}>
                  {leaveStatus.toUpperCase()}
                </Badge>
                <Switch
                  id="leave-status"
                  checked={leaveStatus === 'active'}
                  onCheckedChange={handleToggleLeaveStatus}
                />
              </div>
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
                  step="0.25"
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
                  step="0.25"
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
                  step="0.25"
                />
              ) : (
                <p className="text-2xl font-bold text-accent">{leaveCredits.emergency}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Work Schedule
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setScheduleEditorOpen(true)}
              variant={schedule.length === 0 ? "default" : "outline"}
            >
              {schedule.length === 0 ? "Set Schedule" : "Edit Schedule"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSchedule ? (
            <p className="text-muted-foreground text-center py-4">Loading schedule...</p>
          ) : schedule.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No work schedule set for this user</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Set Schedule" to assign work days and hours
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((dayName, index) => {
                const daySchedule = getScheduleForDay(index);
                const isScheduled = !!daySchedule;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-24 font-medium">{dayName}</div>
                      {isScheduled ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(daySchedule.time_in)} - {formatTime(daySchedule.time_out)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Not Scheduled</div>
                      )}
                    </div>
                    <Badge variant={isScheduled ? "default" : "secondary"}>
                      {isScheduled ? "Scheduled" : "Rest Day"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Password Confirmation Dialog for Leave Credits */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Please enter your HR Admin password to confirm leave credit changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="adminPassword">HR Admin Password</Label>
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

      {/* Password Confirmation Dialog for Leave Status */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Please enter your HR Admin password to {leaveStatus === 'active' ? 'deactivate' : 'activate'} leave credits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="statusPassword">HR Admin Password</Label>
            <Input
              id="statusPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStatusDialog(false);
              setAdminPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmToggleLeaveStatus}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog for Dean Assignment */}
      <Dialog open={deanDialog} onOpenChange={setDeanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Dean Assignment</DialogTitle>
            <DialogDescription>
              Please enter your HR Admin password to designate {personnel.name} as Dean of {personnel.department}.
              This will remove the current Dean if one exists.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="deanPassword">HR Admin Password</Label>
            <Input
              id="deanPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeanDialog(false);
              setAdminPassword("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmSetAsDean}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Editor Dialog */}
      <ScheduleEditorDialog
        open={scheduleEditorOpen}
        onOpenChange={setScheduleEditorOpen}
        personnel={{
          id: personnel.id,
          name: personnel.name,
          staffId: personnel.staffId,
        }}
        existingSchedule={schedule}
        onSuccess={handleScheduleSuccess}
      />
    </div>
  );
}
