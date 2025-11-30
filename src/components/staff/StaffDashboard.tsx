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

export const StaffDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { user } = useAuth();
  
  const [leaveCredits, setLeaveCredits] = useState<{ used: number; remaining: number; total: number } | null>(null);
  const [leaveData, setLeaveData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, undertime: 0, overtime: 0 });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<string>("");
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
          const leaveDetails: LeaveDetails = { leave_type: leave.leave_type || 'Leave', start_date: leave.start_date, end_date: leave.end_date, duration: leave.duration || 0, reason: leave.reason };
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            lookup.set(dateStr, leaveDetails);
            leaveDays.push(new Date(d));
          }
        });
      }
      setApprovedLeaveDays(leaveDays);
      setLeaveLookup(lookup);
    } catch (error: any) { console.error('Error fetching approved leaves:', error); }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    const leaveDetails = leaveLookup.get(dateStr);
    if (leaveDetails) { setSelectedLeaveDetails(leaveDetails); setSelectedDate(date); setShowLeaveDialog(true); }
  };

  const fetchLeaveCredits = async () => {
    try {
      const data = await staffApi.getMyLeaveCredits();
      if (!data.leave_eligible) { setLeaveCredits(null); setLeaveData([]); return; }
      const remaining = Number(data.leave_credits || 0);
      const used = Number(data.used_credits || 0);
      const total = remaining + used;
      setLeaveCredits({ used, remaining, total });
      if (total > 0) { setLeaveData([{ name: "Used", value: used, color: "hsl(var(--destructive))" }, { name: "Remaining", value: remaining, color: "hsl(var(--primary))" }]); } else { setLeaveData([]); }
    } catch (error: any) { setLeaveCredits(null); setLeaveData([]); }
  };

  const fetchAttendanceStats = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      let startDate, endDate;
      if (month >= 8) { startDate = `${year}-08-01`; endDate = `${year}-12-31`; } else { startDate = `${year}-01-01`; endDate = `${year}-05-31`; }
      const response = await fetch(`http://localhost:3001/api/attendance/range?start=${startDate}&end=${endDate}&staff_id=${user.staff_id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Failed to fetch attendance');
      const logs = await response.json();
      let present = 0, late = 0;
      logs.forEach((log: any) => { if (log.attendance_status === 'Late') late++; else if (log.time_in) present++; });
      const totalWorkingDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) / 7 * 5);
      const absent = Math.max(0, totalWorkingDays - (present + late));
      setAttendanceStats({ present, absent, late, undertime: 0, overtime: 0 });
    } catch (error) { console.error("Failed to fetch attendance stats", error); }
  };

  const fetchPerformanceData = async () => {
    try {
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const response = await fetch(`http://localhost:3001/api/attendance/by-month?year=${year}&month=${month}&staff_id=${user.staff_id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        let present = 0, late = 0;
        if (response.ok) { const logs = await response.json(); logs.forEach((log: any) => { if (log.attendance_status === 'Late') late++; else if (log.time_in) present++; }); }
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDays = Math.floor(daysInMonth / 7 * 5);
        const absent = Math.max(0, workingDays - present - late);
        months.push({ month: date.toLocaleString('default', { month: 'short' }), present, absent, late, undertime: 0, overtime: 0 });
      }
      setPerformanceData(months);
      analyzeTrend(months);
    } catch (error) { const fallbackMonths = []; const now = new Date(); for (let i = 11; i >= 0; i--) { const date = new Date(now.getFullYear(), now.getMonth() - i, 1); fallbackMonths.push({ month: date.toLocaleString('default', { month: 'short' }), present: 0, absent: 0, late: 0, undertime: 0, overtime: 0 }); } setPerformanceData(fallbackMonths); }
  };

  const analyzeTrend = (data: any[]) => {
    if (data.length < 2) return;
    const recent = data.slice(-3), earlier = data.slice(0, 3);
    const recentAvg = recent.reduce((sum, m) => sum + m.present, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.present, 0) / earlier.length;
    const lateCount = recent.reduce((sum, m) => sum + m.late, 0);
    const absentCount = recent.reduce((sum, m) => sum + m.absent, 0);
    let trend = "";
    if (recentAvg > earlierAvg * 1.1) trend = "📈 Great improvement! Your attendance has been consistently strong.";
    else if (recentAvg < earlierAvg * 0.9) trend = "📉 Your attendance has declined recently.";
    else if (lateCount > 5) trend = "⏰ You've been late frequently.";
    else if (absentCount > 3) trend = "🚨 Multiple absences detected.";
    else trend = "✅ Your attendance is stable. Keep up the good work!";
    setPerformanceTrend(trend);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm md:text-base text-muted-foreground">Your performance analytics and attendance overview</p>
      </div>
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2"><CardTitle className="text-xs md:text-sm font-medium">Total Present</CardTitle><CheckCircle2 className="h-4 w-4 text-primary" /></CardHeader><CardContent className="p-3 pt-0 md:p-6 md:pt-0"><div className="text-xl md:text-2xl font-bold">{attendanceStats.present} days</div><p className="text-xs text-muted-foreground">This semester</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2"><CardTitle className="text-xs md:text-sm font-medium">Absences</CardTitle><CalendarDays className="h-4 w-4 text-destructive" /></CardHeader><CardContent className="p-3 pt-0 md:p-6 md:pt-0"><div className="text-xl md:text-2xl font-bold">{attendanceStats.absent} days</div><p className="text-xs text-muted-foreground">This semester</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2"><CardTitle className="text-xs md:text-sm font-medium">Tardiness</CardTitle><Clock className="h-4 w-4 text-warning" /></CardHeader><CardContent className="p-3 pt-0 md:p-6 md:pt-0"><div className="text-xl md:text-2xl font-bold">{attendanceStats.late} times</div><p className="text-xs text-muted-foreground">This semester</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2"><CardTitle className="text-xs md:text-sm font-medium">Leave Credits</CardTitle><TrendingUp className="h-4 w-4 text-success" /></CardHeader><CardContent className="p-3 pt-0 md:p-6 md:pt-0">{leaveCredits ? (<><div className="text-xl md:text-2xl font-bold">{leaveCredits.remaining.toFixed(2)} days</div><p className="text-xs text-muted-foreground">Remaining ({leaveCredits.used.toFixed(2)} used)</p></>) : (<><div className="text-xl md:text-2xl font-bold">0.00 days</div><p className="text-xs text-muted-foreground">Not activated</p></>)}</CardContent></Card>
      </div>
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card><CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">My Leave Calendar</CardTitle><CardDescription className="text-xs md:text-sm">Approved leaves are highlighted. Click to view details.</CardDescription></CardHeader><CardContent className="flex justify-center p-4 pt-0 md:p-6 md:pt-0 overflow-x-auto"><Calendar mode="single" selected={selectedDate} onSelect={handleDateClick} className="rounded-md border pointer-events-auto" modifiers={{ approved: approvedLeaveDays }} modifiersStyles={{ approved: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontWeight: 'bold' } }} /></CardContent></Card>
        <Card><CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">Leave Credits Overview</CardTitle></CardHeader><CardContent className="p-4 pt-0 md:p-6 md:pt-0">{leaveCredits && leaveData.length > 0 ? (<ChartContainer config={{ used: { label: "Used", color: "hsl(var(--destructive))" }, remaining: { label: "Remaining", color: "hsl(var(--primary))" } }} className="h-[200px] md:h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={leaveData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value.toFixed(2)}`} outerRadius={60} dataKey="value">{leaveData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Legend /><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ResponsiveContainer></ChartContainer>) : (<div className="flex items-center justify-center h-[200px] md:h-[300px] text-muted-foreground"><div className="text-center"><CalendarDays className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" /><p className="text-sm">Leave credits not activated</p></div></div>)}</CardContent></Card>
      </div>
      <Card><CardHeader className="p-4 md:p-6"><CardTitle className="text-base md:text-lg">Performance Analytics</CardTitle></CardHeader><CardContent className="p-4 pt-0 md:p-6 md:pt-0"><div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><ChartContainer config={{ present: { label: "Present", color: "hsl(142, 76%, 36%)" }, absent: { label: "Absent", color: "hsl(0, 84%, 60%)" }, late: { label: "Late", color: "hsl(38, 92%, 50%)" } }} className="h-[250px] md:h-[300px] min-w-[500px] md:min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={performanceData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><ChartTooltip content={<ChartTooltipContent />} /><Legend wrapperStyle={{ fontSize: '12px' }} /><Bar dataKey="present" fill="hsl(142, 76%, 36%)" /><Bar dataKey="absent" fill="hsl(0, 84%, 60%)" /><Bar dataKey="late" fill="hsl(38, 92%, 50%)" /></BarChart></ResponsiveContainer></ChartContainer></div>{performanceTrend && (<Alert className="mt-4"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{performanceTrend}</AlertDescription></Alert>)}</CardContent></Card>
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}><DialogContent className="max-w-[95vw] md:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Leave Details</DialogTitle><DialogDescription>{selectedDate && `Information for ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}</DialogDescription></DialogHeader>{selectedLeaveDetails && (<div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><p className="text-sm font-medium text-muted-foreground">Leave Type</p><p className="text-base font-semibold capitalize">{selectedLeaveDetails.leave_type}</p></div><div><p className="text-sm font-medium text-muted-foreground">Duration</p><p className="text-base font-semibold">{selectedLeaveDetails.duration} day(s)</p></div></div><div className="grid grid-cols-2 gap-4"><div><p className="text-sm font-medium text-muted-foreground">Start Date</p><p className="text-base">{new Date(selectedLeaveDetails.start_date).toLocaleDateString()}</p></div><div><p className="text-sm font-medium text-muted-foreground">End Date</p><p className="text-base">{new Date(selectedLeaveDetails.end_date).toLocaleDateString()}</p></div></div>{selectedLeaveDetails.reason && (<div><p className="text-sm font-medium text-muted-foreground">Reason</p><p className="text-base">{selectedLeaveDetails.reason}</p></div>)}<div className="p-3 bg-success/10 border border-success/20 rounded-lg"><p className="text-sm text-success-foreground">✅ This leave has been approved</p></div></div>)}</DialogContent></Dialog>
    </div>
  );
};
