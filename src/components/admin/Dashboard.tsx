import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { AttendanceChart } from "./charts/AttendanceChart";
import { LeaveAnalyticsChart } from "./charts/LeaveAnalyticsChart";
import { TardinessChart } from "./charts/TardinessChart";
import { TimeAnalytics } from "./charts/TimeAnalytics";
import { StatusAnalytics } from "./charts/StatusAnalytics";
import { TrendAnalytics } from "./charts/TrendAnalytics";
import { SeasonalAnalytics } from "./charts/SeasonalAnalytics";
import { PredictiveAnalytics } from "./charts/PredictiveAnalytics";
import { OvertimeUndertimeAnalytics } from "./charts/OvertimeUndertimeAnalytics";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

// Mock data for daily attendance table
const mockDailyAttendance = [
  { staffId: "11-2025-0023", name: "Rafael Aquino", timeIn: "08:00 AM", timeOut: "05:00 PM", statusIn: "Present", statusOut: "On Time" },
  { staffId: "11-2025-0024", name: "Ivy Perez", timeIn: "08:15 AM", timeOut: "05:30 PM", statusIn: "Late", statusOut: "Overtime" },
  { staffId: "23-2025-0001", name: "Cedrick Plupenio", timeIn: "07:45 AM", timeOut: "04:45 PM", statusIn: "Present", statusOut: "Undertime" },
];

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Mock stats
  const stats = {
    total: 61,
    present: 0,
    absent: 61,
    late: 0,
  };

  const statCards = [
    { title: "Total Staff", value: stats.total, icon: Users, color: "text-primary" },
    { title: "Present Today", value: stats.present, icon: UserCheck, color: "text-success" },
    { title: "Absent Today", value: stats.absent, icon: UserX, color: "text-destructive" },
    { title: "Tardy Today", value: stats.late, icon: Clock, color: "text-warning" },
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
            <CardTitle>Select Date Range</CardTitle>
            <CardDescription>Choose dates to filter analytics</CardDescription>
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
              <AttendanceChart />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Attendance Table (only for single date) */}
      {isSingleDate && selectedDate && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Daily Attendance Detail</CardTitle>
            <CardDescription>Attendance records for {format(selectedDate, "PPPP")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Status (Time In)</TableHead>
                  <TableHead>Status (Time Out)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDailyAttendance.map((record) => (
                  <TableRow key={record.staffId}>
                    <TableCell className="font-medium">{record.staffId}</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>{record.timeIn}</TableCell>
                    <TableCell>{record.timeOut}</TableCell>
                    <TableCell>
                      <span className={record.statusIn === "Late" ? "text-warning" : "text-success"}>
                        {record.statusIn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={record.statusOut === "Overtime" ? "text-primary" : record.statusOut === "Undertime" ? "text-destructive" : "text-success"}>
                        {record.statusOut}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <LeaveAnalyticsChart selectedDate={selectedDate} dateRange={dateRange} />
        </CardContent>
      </Card>

      {/* Tardiness Analytics */}
      <TardinessChart selectedDate={selectedDate} />

      {/* Time Analytics */}
      <TimeAnalytics selectedDate={selectedDate} dateRange={dateRange} />

      {/* Status Analytics */}
      <StatusAnalytics selectedDate={selectedDate} dateRange={dateRange} />

      {/* Trend Analytics */}
      <TrendAnalytics selectedDate={selectedDate} dateRange={dateRange} />

      {/* Seasonal Analytics */}
      <SeasonalAnalytics selectedDate={selectedDate} dateRange={dateRange} />

      {/* Predictive Analytics */}
      <PredictiveAnalytics selectedDate={selectedDate} dateRange={dateRange} />

      {/* NEW ANALYTICS MODULES BELOW */}
      
      {/* Overtime/Undertime Analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Overtime & Undertime Analytics</CardTitle>
          <CardDescription>Filter by employee type</CardDescription>
          <Select defaultValue="all">
            <SelectTrigger className="w-[250px] mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employee Types</SelectItem>
              <SelectItem value="job-order">Job Order</SelectItem>
              <SelectItem value="cos">Contract of Service</SelectItem>
              <SelectItem value="regular-admin">Regular Admin</SelectItem>
              <SelectItem value="regular-faculty">Regular Faculty</SelectItem>
              <SelectItem value="part-time-faculty">Part-time Faculty</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Overtime Hours</TableHead>
                <TableHead>Undertime Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="cursor-pointer hover:bg-muted/50">
                <TableCell>Rafael Aquino</TableCell>
                <TableCell>Regular Faculty</TableCell>
                <TableCell className="text-primary font-semibold">12.5 hrs</TableCell>
                <TableCell className="text-muted-foreground">0 hrs</TableCell>
              </TableRow>
              <TableRow className="cursor-pointer hover:bg-muted/50">
                <TableCell>Ivy Perez</TableCell>
                <TableCell>Regular Faculty</TableCell>
                <TableCell className="text-primary font-semibold">8 hrs</TableCell>
                <TableCell className="text-destructive">2 hrs</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>


    </div>
  );
}
