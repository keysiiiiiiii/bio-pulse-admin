import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface EmployeeAnalytics {
  rank: number;
  staff_id: string;
  name: string;
  department: string;
  college?: string;
  status: string;
  onTimeRate: number;
  lateRate: number;
  lateCount: number;
  absentCount: number;
}

interface TopLateEmployeesEnhancedProps {
  selectedDate?: Date;
  selectedMonth?: Date;
}

const COLLEGE_OPTIONS = [
  'CCS - College of Computing Studies',
  'CAS - College of Arts and Sciences',
  'CHS - College of Health Sciences',
  'CCJ - College of Criminal Justice',
  'CED - College of Education',
  'CBPM - College of Business and Public Management',
  'CL - College of Law',
  'Gen Ed - General Education',
  'NSTP - National Service Training Program'
];

const DEPARTMENT_OPTIONS = [
  'Canteen',
  'Cleaning Service',
  'Clinic',
  'Library',
  'Security',
  'Human Resource (HR)',
  'Registrar'
];

// ✅ CORRECT: These match employee_type values in staff_users table
const STATUS_OPTIONS = [
  'Regular Admin',
  'Regular Faculty',
  'Part-Time Faculty',
  'Full-time',
  'Job Order',
  'Contract of Service'
];

export function TopLateEmployeesEnhanced({ selectedDate, selectedMonth }: TopLateEmployeesEnhancedProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterCollege, setFilterCollege] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"punctual" | "late" | "absent">("punctual");
  const [topCount, setTopCount] = useState<number>(5);
  const [employees, setEmployees] = useState<EmployeeAnalytics[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeAnalytics();
  }, [selectedDate, selectedMonth, filterStatus, filterDepartment, filterCollege, sortBy, topCount]);

  const fetchEmployeeAnalytics = async () => {
    setLoading(true);
    try {
      const currentDate = selectedMonth || selectedDate || new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Fetch attendance logs for the entire month
      const allLogs: any[] = [];
      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          allLogs.push(...logs);
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      console.log('All logs fetched:', allLogs);

      // Group by staff_id
      const staffMap = new Map<string, any>();
      allLogs.forEach(log => {
        const key = log.staff_id;
        if (!staffMap.has(key)) {
          staffMap.set(key, {
            staff_id: log.staff_id,
            name: log.name,
            department: log.department,
            college: log.college || log.department,
            // ✅ FIXED: Use employee_type instead of role
            status: log.employee_type || 'Staff',
            totalDays: 0,
            onTimeDays: 0,
            lateDays: 0,
            absentDays: 0,
          });
        }
        const staff = staffMap.get(key);
        staff.totalDays++;
        
        if (log.time_in) {
          if (log.status === 'late' || log.status === 'Late' || log.attendance_status === 'late') {
            staff.lateDays++;
          } else {
            staff.onTimeDays++;
          }
        } else {
          staff.absentDays++;
        }
      });

      console.log('Staff map:', staffMap);

      // Calculate rates and filter
      let employeeList: EmployeeAnalytics[] = Array.from(staffMap.values())
        .filter(staff => {
          // ✅ FIXED: Filter by employee_type (status field now contains employee_type)
          if (filterStatus !== "all" && staff.status !== filterStatus) {
            console.log(`Filtering out ${staff.name}: status ${staff.status} !== ${filterStatus}`);
            return false;
          }
          if (filterDepartment !== "all" && staff.department !== filterDepartment) {
            console.log(`Filtering out ${staff.name}: department ${staff.department} !== ${filterDepartment}`);
            return false;
          }
          if (filterCollege !== "all" && staff.college !== filterCollege) {
            console.log(`Filtering out ${staff.name}: college ${staff.college} !== ${filterCollege}`);
            return false;
          }
          return true;
        })
        .map(staff => ({
          rank: 0,
          staff_id: staff.staff_id,
          name: staff.name,
          department: staff.department,
          college: staff.college,
          status: staff.status,
          onTimeRate: staff.totalDays > 0 ? (staff.onTimeDays / staff.totalDays) * 100 : 0,
          lateRate: staff.totalDays > 0 ? (staff.lateDays / staff.totalDays) * 100 : 0,
          lateCount: staff.lateDays,
          absentCount: staff.absentDays,
        }));

      console.log('Employee list before sorting:', employeeList);

      // Sort based on selected criteria
      if (sortBy === "late") {
        employeeList.sort((a, b) => b.lateCount - a.lateCount);
      } else if (sortBy === "absent") {
        employeeList.sort((a, b) => b.absentCount - a.absentCount);
      } else {
        employeeList.sort((a, b) => b.onTimeRate - a.onTimeRate);
      }

      // Take top N and assign ranks
      employeeList = employeeList.slice(0, topCount).map((emp, idx) => ({
        ...emp,
        rank: idx + 1,
      }));

      console.log('Final employee list:', employeeList);

      setEmployees(employeeList);

      // Set unique departments and colleges from the data
      const uniqueDepts = Array.from(new Set(Array.from(staffMap.values()).map(s => s.department).filter(Boolean))).sort();
      const uniqueColleges = Array.from(new Set(Array.from(staffMap.values()).map(s => s.college).filter(Boolean))).sort();
      setDepartments(uniqueDepts);
      setColleges(uniqueColleges);

    } catch (error) {
      console.error('Failed to fetch employee analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate: number, isOnTime: boolean) => {
    if (isOnTime) {
      if (rate >= 90) return "text-success";
      if (rate >= 70) return "text-warning";
      return "text-destructive";
    } else {
      if (rate >= 30) return "text-destructive";
      if (rate >= 10) return "text-warning";
      return "text-success";
    }
  };

  const getStatusBadge = (status: string) => {
    const badgeConfig: Record<string, { variant: any; className: string }> = {
      "Regular Admin": { variant: "default", className: "bg-blue-600 text-white hover:bg-blue-700" },
      "Regular Faculty": { variant: "default", className: "bg-green-600 text-white hover:bg-green-700" },
      "Part-Time Faculty": { variant: "default", className: "bg-teal-600 text-white hover:bg-teal-700" },
      "Full-time": { variant: "default", className: "bg-purple-600 text-white hover:bg-purple-700" },
      "Job Order": { variant: "default", className: "bg-orange-600 text-white hover:bg-orange-700" },
      "Contract of Service": { variant: "default", className: "bg-pink-600 text-white hover:bg-pink-700" },
      "COS": { variant: "default", className: "bg-pink-600 text-white hover:bg-pink-700" },
    };
    
    const config = badgeConfig[status] || { variant: "default", className: "bg-gray-600 text-white hover:bg-gray-700" };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  return (
    <Card className="shadow-md border-l-4 border-l-orange-500">
      <CardHeader>
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-orange-500">Top Punctual/Late/Absent Employees</CardTitle>
            <CardDescription>
              Employees with the highest punctuality, late and absent occurrences
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENT_OPTIONS.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCollege} onValueChange={setFilterCollege}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colleges</SelectItem>
              {COLLEGE_OPTIONS.map(college => (
                <SelectItem key={college} value={college}>{college}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(val) => setSortBy(val as "late" | "punctual" | "absent")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="punctual">Most Punctual</SelectItem>
              <SelectItem value="late">Most Late</SelectItem>
              <SelectItem value="absent">Most Absent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topCount.toString()} onValueChange={(val) => setTopCount(Number(val))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="15">Top 15</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No employees match the selected criteria
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">Rank</TableHead>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>College/Dept</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">On-Time Rate</TableHead>
                    <TableHead className="text-right">Late Rate</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.staff_id}>
                      <TableCell>
                        {emp.rank <= 3 ? (
                          <Badge variant="destructive" className="rounded-full">
                            #{emp.rank}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">#{emp.rank}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{emp.staff_id}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-sm">{emp.college || emp.department}</TableCell>
                      <TableCell>{getStatusBadge(emp.status)}</TableCell>
                      <TableCell className={`text-right font-semibold ${getRateColor(emp.onTimeRate, true)}`}>
                        {emp.onTimeRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${getRateColor(emp.lateRate, false)}`}>
                        {emp.lateRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">{emp.lateCount}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{emp.absentCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}