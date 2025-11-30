import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarDays, TrendingUp, Clock, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { staffApi } from "@/services/api/staffApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { API_BASE_URL } from "@/services/api/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeaveDetails {
  leave_type: string;
  start_date: string;
  end_date: string;
  duration: number;
  reason?: string;
}

export const FacultyDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { user } = useAuth();

  // Leave Credits State
  const [leaveCredits, setLeaveCredits] = useState<{ used: number; remaining: number; total: number } | null>(null);
  const [leaveData, setLeaveData] = useState<Array<{ name: string; value: number; color: string }>>([]);

  // Attendance Stats State
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    undertime: 0,
    overtime: 0
  });

  // Performance Data State
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<string>("");

  // Leave Calendar State
  const [approvedLeaveDays, setApprovedLeaveDays] = useState<Date[]>([]);
  const [leaveLookup, setLeaveLookup] = useState<Map<string, LeaveDetails>>(new Map());
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<LeaveDetails | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  useEffect(() => {
    if (user?.staff_id) {
      fetchLeaveCredits();
      fetchAttendanceStats();
      fetchPerformanceData();
      fetchApprovedLeaves();
    }
  }, [user]);

  const fetchApprovedLeaves = async () => {
    const userId = (user as any)?.id || (user as any)?.staff_user_id;

    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { staff_user_id: userId, status: 'approved' }
      });

      const leaveDays: Date[] = [];
      const lookup = new Map<string, LeaveDetails>();
      
      if (response.data?.data) {
        response.data.data.forEach((leave: any) => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          const leaveDetails: LeaveDetails = {
            leave_type: leave.leave_type || 'Leave',
            start_date: leave.start_date,
            end_date: leave.end_date,
            duration: leave.duration || 0,
            reason: leave.reason
          };
          
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            lookup.set(dateStr, leaveDetails);
            leaveDays.push(new Date(d));
          }
        });
      }

      setApprovedLeaveDays(leaveDays);
      setLeaveLookup(lookup);
    } catch (error: any) {
      console.error('Error fetching approved leaves:', error);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    
    const dateStr = date.toISOString().split('T')[0];
    const leaveDetails = leaveLookup.get(dateStr);
    
    if (leaveDetails) {
      setSelectedLeaveDetails(leaveDetails);
      setSelectedDate(date);
      setShowLeaveDialog(true);
    }
  };

  // ✅ Fetch Leave Credits with Used/Remaining
  const fetchLeaveCredits = async () => {
    try {
      console.log('🔵 Fetching leave credits');

      const data = await staffApi.getMyLeaveCredits();
      console.log('✅ Response:', data);

      if (!data.leave_eligible) {
        setLeaveCredits(null);
        setLeaveData([]);
        return;
      }

      // ✅ Get both remaining and used credits
      const remaining = Number(data.leave_credits || 0);
      const used = Number(data.used_credits || 0);
      const total = remaining + used;

      setLeaveCredits({ used, remaining, total });

      // ✅ Show both in pie chart (if there's any data)
      if (total > 0) {
        setLeaveData([
          { name: "Used", value: used, color: "hsl(var(--destructive))" },
          { name: "Remaining", value: remaining, color: "hsl(var(--primary))" },
        ]);
      } else {
        setLeaveData([]);
      }

    } catch (error: any) {
      console.error("❌ Failed to fetch leave credits", error);
      setLeaveCredits(null);
      setLeaveData([]);
    }
  };

  // ✅ Fetch Real Attendance Stats (This Semester)
  const fetchAttendanceStats = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      let startDate, endDate;
      if (month >= 8) {
        startDate = `${year}-08-01`;
        endDate = `${year}-12-31`;
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year}-05-31`;
      }

      const response = await fetch(`http://localhost:3001/api/attendance/range?start=${startDate}&end=${endDate}&staff_id=${user.staff_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch attendance');

      const logs = await response.json();

      let present = 0, late = 0;

      logs.forEach((log: any) => {
        if (log.attendance_status === 'Late') late++;
        else if (log.time_in) present++;
      });

      const totalWorkingDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) / 7 * 5);
      const absent = Math.max(0, totalWorkingDays - (present + late));

      setAttendanceStats({ present, absent, late, undertime: 0, overtime: 0 });

    } catch (error) {
      console.error("❌ Failed to fetch attendance stats", error);
    }
  };

  // ✅ FIXED: Fetch Performance Data (Last 12 Months) with correct absent calculation
  const fetchPerformanceData = async () => {
    try {
      const months = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const response = await fetch(`http://localhost:3001/api/attendance/by-month?year=${year}&month=${month}&staff_id=${user.staff_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        let present = 0, late = 0;
        let daysWithAttendance = new Set<string>();

        if (response.ok) {
          const logs = await response.json();

          logs.forEach((log: any) => {
            // Track which dates have attendance
            if (log.att_date) {
              daysWithAttendance.add(log.att_date);
            }
            
            if (log.attendance_status === 'Late') {
              late++;
            } else if (log.time_in) {
              present++;
            }
          });
        }

        // ✅ Calculate working days in the month (approx Mon-Fri)
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDays = Math.floor(daysInMonth / 7 * 5); // Rough estimate: 5 working days per week
        
        // ✅ Absent = Working days - (Present + Late)
        const absent = Math.max(0, workingDays - present - late);

        const monthName = date.toLocaleString('default', { month: 'short' });

        months.push({
          month: monthName,
          present,
          absent,
          late,
          undertime: 0,
          overtime: 0
        });
      }

      setPerformanceData(months);
      analyzeTrend(months);

    } catch (error) {
      console.error("❌ Failed to fetch performance data", error);

      // Fallback: show 12 empty months
      const fallbackMonths = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        fallbackMonths.push({
          month: monthName,
          present: 0,
          absent: 0,
          late: 0,
          undertime: 0,
          overtime: 0
        });
      }
      setPerformanceData(fallbackMonths);
    }
  };

  // ✅ AI-like Trend Analysis
  const analyzeTrend = (data: any[]) => {
    if (data.length < 2) return;

    const recent = data.slice(-3);
    const earlier = data.slice(0, 3);

    const recentAvg = recent.reduce((sum, m) => sum + m.present, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.present, 0) / earlier.length;

    const lateCount = recent.reduce((sum, m) => sum + m.late, 0);
    const absentCount = recent.reduce((sum, m) => sum + m.absent, 0);

    let trend = "";

    if (recentAvg > earlierAvg * 1.1) {
      trend = "📈 Great improvement! Your attendance has been consistently strong over the past few months.";
    } else if (recentAvg < earlierAvg * 0.9) {
      trend = "📉 Your attendance has declined recently. Consider maintaining better punctuality.";
    } else if (lateCount > 5) {
      trend = "⏰ You've been late frequently. Try to arrive earlier to improve your record.";
    } else if (absentCount > 3) {
      trend = "🚨 Multiple absences detected. Please ensure you're meeting attendance requirements.";
    } else {
      trend = "✅ Your attendance is stable. Keep up the good work!";
    }

    setPerformanceTrend(trend);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Your performance analytics and attendance overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.present} days</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <CalendarDays className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.absent} days</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tardiness</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.late} times</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {leaveCredits ? (
              <>
                <div className="text-2xl font-bold">{leaveCredits.remaining.toFixed(2)} days</div>
                <p className="text-xs text-muted-foreground">Remaining ({leaveCredits.used.toFixed(2)} used)</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">0.00 days</div>
                <p className="text-xs text-muted-foreground">Not activated</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leave Calendar with Approved Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>My Leave Calendar</CardTitle>
            <CardDescription>
              Days with approved leave requests are highlighted in blue. Click a date to view details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateClick}
              className="rounded-md border"
              modifiers={{
                approved: approvedLeaveDays
              }}
              modifiersStyles={{
                approved: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Leave Credits Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Credits Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveCredits && leaveData.length > 0 ? (
              <ChartContainer
                config={{
                  used: { label: "Used", color: "hsl(var(--destructive))" },
                  remaining: { label: "Remaining", color: "hsl(var(--primary))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leaveData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Leave credits not activated</p>
                  <p className="text-xs">Contact admin to activate your leave credits</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              present: { label: "Present", color: "hsl(142, 76%, 36%)" },
              absent: { label: "Absent", color: "hsl(0, 84%, 60%)" },
              late: { label: "Late", color: "hsl(38, 92%, 50%)" },
              undertime: { label: "Undertime", color: "hsl(262, 83%, 58%)" },
              overtime: { label: "Overtime", color: "hsl(199, 89%, 48%)" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="present" fill="hsl(142, 76%, 36%)" />
                <Bar dataKey="absent" fill="hsl(0, 84%, 60%)" />
                <Bar dataKey="late" fill="hsl(38, 92%, 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* AI Trend Analysis */}
          {performanceTrend && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{performanceTrend}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Leave Details Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Leave Details
            </DialogTitle>
            <DialogDescription>
              {selectedDate && `Information for ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLeaveDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leave Type</p>
                  <p className="text-base font-semibold capitalize">{selectedLeaveDetails.leave_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-base font-semibold">{selectedLeaveDetails.duration} day(s)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-base">{new Date(selectedLeaveDetails.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base">{new Date(selectedLeaveDetails.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedLeaveDetails.reason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reason</p>
                  <p className="text-base">{selectedLeaveDetails.reason}</p>
                </div>
              )}

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success-foreground">
                  ✅ This leave has been approved
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};