import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarDays, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { staffApi } from "@/services/api/staffApi";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const StaffDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

  useEffect(() => {
    if (user?.staff_id) {
      fetchLeaveCredits();
      fetchAttendanceStats();
      fetchPerformanceData();
    }
  }, [user]);

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
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
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
    </div>
  );
};