import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { AttendanceChart } from "./charts/AttendanceChart";
import { LeaveAnalyticsChart } from "./charts/LeaveAnalyticsChart";
import { TardinessChart } from "./charts/TardinessChart";
import { StatusAnalytics } from "./charts/StatusAnalytics";
import { TopLateAbsentEmployees } from "./charts/TopLateAbsentEmployees";
import { TopEmployeesDashboard } from "./charts/TopEmployeesDashboard";
import { Users, UserCheck, UserX, Clock, CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { attendanceApi, analyticsApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";

// Helper to format time from database (handles both ISO and time-only strings)
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return 'N/A';

  // Extract HH:MM from either "2025-10-14T08:46:00" or "08:46:00"
  const time = timeStr.includes('T')
    ? timeStr.split('T')[1].slice(0, 5)  // ISO format
    : timeStr.slice(0, 5);               // Time-only format

  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;

  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// Mock data for daily attendance table
const mockDailyAttendance = [
  { staffId: "11-2025-0023", name: "Rafael Aquino", timeIn: "08:00 AM", timeOut: "05:00 PM", statusIn: "Present", statusOut: "On Time" },
  { staffId: "11-2025-0024", name: "Ivy Perez", timeIn: "08:15 AM", timeOut: "05:30 PM", statusIn: "Late", statusOut: "Overtime" },
  { staffId: "23-2025-0001", name: "Cedrick Plupenio", timeIn: "07:45 AM", timeOut: "04:45 PM", statusIn: "Present", statusOut: "Undertime" },
];

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, on_leave: 0 });
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "faculty" | "staff">("all");
  const [exportingDaily, setExportingDaily] = useState(false);
  const [exportingMonthly, setExportingMonthly] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate]);

  const fetchDashboardData = async (date: string) => {
    setLoading(true);
    try {
      const [statsData, logsData] = await Promise.all([
        attendanceApi.getStats(date),
        attendanceApi.getLogs(date)
      ]);
      setStats({
        total: statsData.total,
        present: statsData.present,
        absent: statsData.absent,
        late: statsData.late,
        on_leave: statsData.on_leave || 0
      });
      setDailyAttendance(logsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportDailyAttendance = async () => {
    if (!selectedDate) return;
    setExportingDaily(true);
    try {
      const date = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/attendance/export/daily?date=${date}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Daily attendance exported successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export attendance",
        variant: "destructive"
      });
    } finally {
      setExportingDaily(false);
    }
  };

  const exportMonthlyAttendance = async () => {
    if (!selectedMonth) return;
    setExportingMonthly(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const response = await fetch(`/api/attendance/export/monthly?year=${year}&month=${month}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${year}-${month.toString().padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Monthly attendance exported successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export attendance",
        variant: "destructive"
      });
    } finally {
      setExportingMonthly(false);
    }
  };

  const statCards = [
    { title: "Total Staff", value: stats.total, icon: Users, color: "text-primary" },
    { title: "Present Today", value: stats.present, icon: UserCheck, color: "text-success" },
    { title: "Absent Today", value: stats.absent, icon: UserX, color: "text-destructive" },
    { title: "Tardy Today", value: stats.late, icon: Clock, color: "text-warning" },
    { title: "Leave Today", value: stats.on_leave, icon: CalendarDays, color: "text-info" },
  ];

  const isSingleDate = selectedDate && !dateRange;
  const isDateRange = dateRange?.from && dateRange?.to;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Analytics and insights for attendance management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar and Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view attendance analytics</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex gap-2 w-full justify-center">
              <Select value={selectedMonth.getMonth().toString()} onValueChange={(val) => setSelectedMonth(new Date(selectedMonth.getFullYear(), parseInt(val)))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth.getFullYear().toString()} onValueChange={(val) => setSelectedMonth(new Date(parseInt(val), selectedMonth.getMonth()))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              className="rounded-md border pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Daily Attendance Breakdown</CardTitle>
            <CardDescription>
              {isSingleDate && selectedDate ? format(selectedDate, "PPP") : "Present, Absent, and Tardy distribution"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDateRange ? (
              <div className="p-8 text-center">
                <p className="text-lg font-semibold">Date Range Summary</p>
                <p className="text-muted-foreground mt-2">
                  {dateRange.from && format(dateRange.from, "PP")} - {dateRange.to && format(dateRange.to, "PP")}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div>
                    <p className="text-2xl font-bold text-success">45</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">10</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">6</p>
                    <p className="text-sm text-muted-foreground">Tardy</p>
                  </div>
                </div>
              </div>
            ) : (
              <AttendanceChart selectedDate={selectedDate} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Attendance Table (only for single date) */}
      {isSingleDate && selectedDate && (
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Daily Attendance Detail</CardTitle>
                <CardDescription>Attendance records for {format(selectedDate, "PPPP")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={attendanceFilter} onValueChange={(val) => setAttendanceFilter(val as "all" | "faculty" | "staff")}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportDailyAttendance}
                  disabled={exportingDaily}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingDaily ? "Exporting..." : "Export Daily"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportMonthlyAttendance}
                  disabled={exportingMonthly}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingMonthly ? "Exporting..." : "Export Monthly"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Status (In)</TableHead>
                      <TableHead>Status (Out)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No attendance records for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyAttendance
                        .filter(record => {
                          if (attendanceFilter === "all") return true;
                          if (attendanceFilter === "faculty") return record.role?.toLowerCase() === "faculty";
                          if (attendanceFilter === "staff") return record.role?.toLowerCase() === "staff";
                          return true;
                        })
                        .map((record, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{record.staff_id}</TableCell>
                            <TableCell>{record.name}</TableCell>
                            <TableCell className="capitalize">{record.role || 'N/A'}</TableCell>
                            <TableCell>{record.department || 'N/A'}</TableCell>
                            <TableCell>{formatTime(record.time_in)}</TableCell>
                            <TableCell>{formatTime(record.time_out)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.status === 'Present' ? 'bg-success/10 text-success' :
                                record.status === 'Late' ? 'bg-warning/10 text-warning' :
                                  'bg-destructive/10 text-destructive'
                                }`}>
                                {record.status === 'Late' ? 'Late' : record.status === 'Present' ? 'On Time' : 'Absent'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {record.time_out ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                                  On Time
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Leave Analytics</CardTitle>
          <CardDescription>Monthly leave requests by type (scroll horizontally to see Jan-Dec)</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveAnalyticsChart selectedMonth={selectedMonth} />
        </CardContent>
      </Card>

      {/* Tardiness Analytics */}
      <TardinessChart selectedMonth={selectedMonth} />

      {/* Top Employees - Moved from Analytics */}
      <TopEmployeesDashboard selectedDate={selectedDate} dateRange={dateRange} />

      {/* Top Late/Absent Employees - NEW */}
      <TopLateAbsentEmployees selectedDate={selectedDate} dateRange={dateRange} />

      {/* Status Analytics */}
      <StatusAnalytics selectedDate={selectedDate} dateRange={dateRange} />
    </div>
  );
}
