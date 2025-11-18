import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { AttendanceChart } from "./charts/AttendanceChart";
import { LeaveAnalyticsChart } from "./charts/LeaveAnalyticsChart";
import { TardinessChart } from "./charts/TardinessChart";
import { TopLateEmployeesEnhanced } from "./charts/TopLateEmployeesEnhanced";
import { StatusDistributionDual } from "./charts/StatusDistributionDual";
import { DayOfWeekComparison } from "./charts/DayOfWeekComparison";
import { FacultyStaffPatternsStacked } from "./charts/FacultyStaffPatternsStacked";
import { Users, UserCheck, UserX, Clock, CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// Helper to format time from database
const formatTime = (timeStr: string | null): string => {
  if (!timeStr) return 'N/A';
  
  // Handle time format: "HH:MM:SS" or timestamp
  let timeOnly = timeStr;
  if (timeStr.includes('T')) {
    timeOnly = timeStr.split('T')[1];
  }
  
  const [h, m] = timeOnly.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

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
      console.log('Fetching data for date:', date);
      
      // First, get total staff count (always display)
      const { data: totalStaff, error: staffError } = await supabase
        .from('staff_users')
        .select('id', { count: 'exact', head: true });
      
      if (staffError) {
        console.error('Error fetching total staff:', staffError);
        throw staffError;
      }
      
      const totalStaffCount = totalStaff?.length || 0;
      console.log('Total staff in system:', totalStaffCount);
      
      // Join with staff_users to get name, department, employee_type
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          staff_users!inner (
            staff_id,
            name,
            employee_type,
            department
          )
        `)
        .eq('att_date', date);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched logs:', logs);

      // If no attendance records exist, default to all absent
      if (!logs || logs.length === 0) {
        console.log('No records found for date:', date);
        setStats({ 
          total: totalStaffCount, 
          present: 0, 
          absent: totalStaffCount, 
          late: 0, 
          on_leave: 0 
        });
        setDailyAttendance([]);
        setLoading(false);
        return;
      }

      // Transform data to flatten staff_users
      const transformedLogs = logs.map(log => ({
        ...log,
        staff_id: log.staff_users.staff_id,
        name: log.staff_users.name,
        role: log.staff_users.employee_type,
        department: log.staff_users.department
      }));

      // Calculate stats
      const present = transformedLogs.filter(l => 
        l.status && (l.status.toLowerCase() === 'present' || l.status.toLowerCase() === 'late')
      ).length;
      
      const late = transformedLogs.filter(l => 
        l.status && l.status.toLowerCase() === 'late'
      ).length;
      
      const onLeave = transformedLogs.filter(l => l.on_leave === 1 || l.on_leave === true).length;

      // Absent = Total Staff - Present - On Leave
      const absent = totalStaffCount - present - onLeave;

      const calculatedStats = {
        total: totalStaffCount,
        present: present,
        absent: absent,
        late: late,
        on_leave: onLeave
      };

      console.log('Calculated stats:', calculatedStats);

      setStats(calculatedStats);
      setDailyAttendance(transformedLogs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Check console for details.",
        variant: "destructive"
      });
      setStats({ total: 0, present: 0, absent: 0, late: 0, on_leave: 0 });
      setDailyAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const exportDailyAttendance = async () => {
    if (!selectedDate || dailyAttendance.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records to export",
        variant: "destructive"
      });
      return;
    }
    
    setExportingDaily(true);
    try {
      const exportData = dailyAttendance.map(record => ({
        'Staff ID': record.staff_id,
        'Name': record.name,
        'Role': record.role || 'N/A',
        'Department': record.department || 'N/A',
        'Date': record.att_date || format(selectedDate, 'yyyy-MM-dd'),
        'Time In': formatTime(record.time_in),
        'Original Time In': formatTime(record.orig_time_in),
        'Time Out': formatTime(record.time_out),
        'Original Time Out': formatTime(record.orig_time_out),
        'Status': record.status || 'N/A',
        'Minutes Late': record.minute_late || 0,
        'Hours Worked': record.worked_hours || 0,
        'Overtime Hours': record.overtime_hours || 0,
        'Is Absent': record.is_absent ? 'Yes' : 'No',
        'Week of Year': record.week_of_year || '',
        'Month': record.month || '',
        'On Leave': record.on_leave ? 'Yes' : 'No',
        'Leave Type': record.leave_type || '',
        'Leave Block ID': record.leave_block_id || '',
        'Leave Duration (Days)': record.leave_duration || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
      
      XLSX.writeFile(wb, `Daily_Attendance_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
      
      toast({
        title: "Success",
        description: "Daily attendance exported successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
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
      
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          staff_users!inner (
            staff_id,
            name,
            employee_type,
            department
          )
        `)
        .eq('month', month);
      
      if (error) throw error;
      
      if (!logs || logs.length === 0) {
        toast({
          title: "No Data",
          description: "No attendance records for this month",
          variant: "destructive"
        });
        return;
      }
      
      const exportData = logs.map(record => ({
        'Staff ID': record.staff_users.staff_id,
        'Name': record.staff_users.name,
        'Role': record.staff_users.employee_type || 'N/A',
        'Department': record.staff_users.department || 'N/A',
        'Date': record.att_date,
        'Time In': formatTime(record.time_in),
        'Original Time In': formatTime(record.orig_time_in),
        'Time Out': formatTime(record.time_out),
        'Original Time Out': formatTime(record.orig_time_out),
        'Status': record.status || 'N/A',
        'Minutes Late': record.minute_late || 0,
        'Hours Worked': record.worked_hours || 0,
        'Overtime Hours': record.overtime_hours || 0,
        'Is Absent': record.is_absent ? 'Yes' : 'No',
        'Week of Year': record.week_of_year || '',
        'Month': record.month || '',
        'On Leave': record.on_leave ? 'Yes' : 'No',
        'Leave Type': record.leave_type || '',
        'Leave Block ID': record.leave_block_id || '',
        'Leave Duration (Days)': record.leave_duration || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
      
      XLSX.writeFile(wb, `Monthly_Attendance_${year}-${month.toString().padStart(2, '0')}.xlsx`);
      
      toast({
        title: "Success",
        description: "Monthly attendance exported successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* Daily Attendance Table */}
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
                      <TableHead>Status</TableHead>
                      <TableHead>Minutes Late</TableHead>
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
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.status?.toLowerCase() === 'present' ? 'bg-success/10 text-success' :
                                record.status?.toLowerCase() === 'late' ? 'bg-warning/10 text-warning' :
                                'bg-destructive/10 text-destructive'
                              }`}>
                                {record.status || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>{record.minute_late || 0}</TableCell>
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
          <CardDescription>Leave requests by type for {format(selectedMonth, "MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveAnalyticsChart selectedMonth={selectedMonth} />
        </CardContent>
      </Card>

      {/* Tardiness Analytics */}
      <TardinessChart selectedMonth={selectedMonth} />

      {/* Top/Late Employees */}
      <TopLateEmployeesEnhanced selectedDate={selectedDate} />

      {/* Distribution of STATUS */}
      <StatusDistributionDual selectedDate={selectedDate} />

      {/* Day-of-Week Analysis */}
      <DayOfWeekComparison selectedDate={selectedDate} />

      {/* Faculty vs. Staff Attendance Patterns */}
      <FacultyStaffPatternsStacked selectedDate={selectedDate} />
    </div>
  );
}