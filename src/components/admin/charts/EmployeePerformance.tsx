import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { API_BASE_URL } from "@/services/api/config";

interface EmployeePerformanceProps {
  selectedDate?: Date;
  dateRange?: { from: Date; to: Date };
}

interface PerformanceData {
  staffId: string;
  name: string;
  department: string;
  employmentStatus: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  attendanceRate: number;
  punctualityRate: number;
  averageMinutesLate: number;
}

export function EmployeePerformance({ selectedDate, dateRange }: EmployeePerformanceProps) {
  const [sortBy, setSortBy] = useState<'attendance' | 'punctuality' | 'lateness'>('attendance');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [topCount, setTopCount] = useState(10);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedDate, dateRange, sortBy, filterStatus, topCount]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let startDate: Date;
      let endDate: Date;

      if (dateRange?.from && dateRange?.to) {
        startDate = dateRange.from;
        endDate = dateRange.to;
      } else if (selectedDate) {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      } else {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      }

      const response = await fetch(
        `${API_BASE_URL}/api/attendance/logs?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch attendance data');

      const data = await response.json();
      
      // Group by employee
      const grouped: Record<string, {
        name: string;
        department: string;
        employmentStatus: string;
        totalDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        leaveDays: number;
        totalMinutesLate: number;
      }> = {};

      data.forEach((log: any) => {
        const staffId = log.staff_id;
        
        if (!grouped[staffId]) {
          grouped[staffId] = {
            name: log.name || 'Unknown',
            department: log.department || 'Unknown',
            employmentStatus: log.employment_status || 'Unknown',
            totalDays: 0,
            presentDays: 0,
            lateDays: 0,
            absentDays: 0,
            leaveDays: 0,
            totalMinutesLate: 0,
          };
        }

        grouped[staffId].totalDays++;

        if (log.on_leave) {
          grouped[staffId].leaveDays++;
        } else if (log.attendance_status === 'Present') {
          grouped[staffId].presentDays++;
        } else if (log.attendance_status === 'Late') {
          grouped[staffId].lateDays++;
          grouped[staffId].totalMinutesLate += log.minute_late || 0;
        } else if (log.attendance_status === 'Absent') {
          grouped[staffId].absentDays++;
        }
      });

      // Convert to array and calculate rates
      let perfArray: PerformanceData[] = Object.entries(grouped).map(([staffId, stats]) => ({
        staffId,
        name: stats.name,
        department: stats.department,
        employmentStatus: stats.employmentStatus,
        totalDays: stats.totalDays,
        presentDays: stats.presentDays,
        lateDays: stats.lateDays,
        absentDays: stats.absentDays,
        leaveDays: stats.leaveDays,
        attendanceRate: stats.totalDays > 0 ? ((stats.presentDays + stats.lateDays) / stats.totalDays) * 100 : 0,
        punctualityRate: stats.totalDays > 0 ? (stats.presentDays / stats.totalDays) * 100 : 0,
        averageMinutesLate: stats.lateDays > 0 ? stats.totalMinutesLate / stats.lateDays : 0,
      }));

      // Filter by employment status
      if (filterStatus !== 'all') {
        perfArray = perfArray.filter(emp => emp.employmentStatus === filterStatus);
      }

      // Sort
      perfArray.sort((a, b) => {
        if (sortBy === 'attendance') {
          return b.attendanceRate - a.attendanceRate;
        } else if (sortBy === 'punctuality') {
          return b.punctualityRate - a.punctualityRate;
        } else {
          return b.averageMinutesLate - a.averageMinutesLate;
        }
      });

      // Take top N
      perfArray = perfArray.slice(0, topCount);

      setPerformanceData(perfArray);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 85) return <Badge className="bg-blue-500">Good</Badge>;
    if (rate >= 70) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Employee Performance Analysis</CardTitle>
            <CardDescription>
              Individual employee attendance and punctuality metrics
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Regular Admin">Regular Admin</SelectItem>
                <SelectItem value="Regular Faculty">Regular Faculty</SelectItem>
                <SelectItem value="Part-Time Faculty">Part Time Faculty</SelectItem>
                <SelectItem value="Full-time">Full Time</SelectItem>
                <SelectItem value="Job Order">Job Order</SelectItem>
                <SelectItem value="Contract of Service">COS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(val: 'attendance' | 'punctuality' | 'lateness') => setSortBy(val)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance">Best Attendance</SelectItem>
                <SelectItem value="punctuality">Most Punctual</SelectItem>
                <SelectItem value="lateness">Most Late</SelectItem>
              </SelectContent>
            </Select>
            <Select value={topCount.toString()} onValueChange={(val) => setTopCount(parseInt(val))}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading performance data...</p>
          </div>
        ) : performanceData.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No data available for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Days</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Leave</TableHead>
                  <TableHead className="text-right">Attendance %</TableHead>
                  <TableHead className="text-right">Punctuality %</TableHead>
                  <TableHead className="text-right">Avg Min Late</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((emp, index) => (
                  <TableRow key={emp.staffId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{emp.staffId}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell className="text-sm">{emp.employmentStatus}</TableCell>
                    <TableCell className="text-right">{emp.totalDays}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{emp.presentDays}</TableCell>
                    <TableCell className="text-right text-yellow-600 font-medium">{emp.lateDays}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{emp.absentDays}</TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">{emp.leaveDays}</TableCell>
                    <TableCell className="text-right font-medium">{emp.attendanceRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium">{emp.punctualityRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{emp.averageMinutesLate.toFixed(0)}</TableCell>
                    <TableCell>{getPerformanceBadge(emp.attendanceRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
