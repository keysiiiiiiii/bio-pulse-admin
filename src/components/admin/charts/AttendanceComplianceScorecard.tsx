import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Award, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface AttendanceComplianceProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

interface DepartmentCompliance {
  department: string;
  attendanceRate: number;
  punctualityRate: number;
  perfectAttendanceCount: number;
  riskCount: number;
  trend: number;
}

interface EmployeeRisk {
  staff_id: string;
  name: string;
  department: string;
  attendanceRate: number;
  lateCount: number;
  status: 'critical' | 'warning' | 'watch';
}

export function AttendanceComplianceScorecard({ selectedDate, dateRange }: AttendanceComplianceProps) {
  const [viewType, setViewType] = useState<'faculty' | 'staff'>('faculty');
  const [departmentData, setDepartmentData] = useState<DepartmentCompliance[]>([]);
  const [riskEmployees, setRiskEmployees] = useState<EmployeeRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonthTrend, setCurrentMonthTrend] = useState({ present: 0, total: 0, rate: 0 });
  const [previousMonthTrend, setPreviousMonthTrend] = useState({ present: 0, total: 0, rate: 0 });

  useEffect(() => {
    fetchComplianceData();
  }, [selectedDate, dateRange, viewType]);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const today = selectedDate || new Date();
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(today), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(endOfMonth(today), 'yyyy-MM-dd');

      // Previous month for trend comparison
      const prevStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
      const prevEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');

      // Fetch attendance trends for both periods
      const [currentTrend, prevTrend] = await Promise.all([
        analyticsApi.getAttendanceTrend(start, end),
        analyticsApi.getAttendanceTrend(prevStart, prevEnd)
      ]);

      // Calculate overall trends
      const currentTotal = currentTrend.reduce((sum, day) => sum + day.present + day.absent, 0);
      const currentPresent = currentTrend.reduce((sum, day) => sum + day.present, 0);
      const prevTotal = prevTrend.reduce((sum, day) => sum + day.present + day.absent, 0);
      const prevPresent = prevTrend.reduce((sum, day) => sum + day.present, 0);

      setCurrentMonthTrend({
        present: currentPresent,
        total: currentTotal,
        rate: currentTotal > 0 ? (currentPresent / currentTotal) * 100 : 0
      });

      setPreviousMonthTrend({
        present: prevPresent,
        total: prevTotal,
        rate: prevTotal > 0 ? (prevPresent / prevTotal) * 100 : 0
      });

      // Get top absentees for risk analysis
      const absentees = await analyticsApi.getTopAbsentees(start, end, 50);

      // Process department compliance data
      const deptMap = new Map<string, {
        totalDays: number;
        presentDays: number;
        lateDays: number;
        perfectEmployees: Set<string>;
        allEmployees: Set<string>;
      }>();

      // Fetch attendance logs for the period
      const startDate = new Date(start);
      const endDate = new Date(end);
      const dates: string[] = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(format(d, 'yyyy-MM-dd'));
      }

      // Aggregate data by department
      for (const date of dates) {
        try {
          const logs = await attendanceApi.getLogs(date);
          const filteredLogs = logs.filter(log => log.role === viewType);

          filteredLogs.forEach(log => {
            const dept = log.department || 'Unknown';
            if (!deptMap.has(dept)) {
              deptMap.set(dept, {
                totalDays: 0,
                presentDays: 0,
                lateDays: 0,
                perfectEmployees: new Set(),
                allEmployees: new Set()
              });
            }

            const deptData = deptMap.get(dept)!;
            deptData.totalDays++;
            deptData.allEmployees.add(log.staff_id);

            if (log.status === 'Present' || log.status === 'Late') {
              deptData.presentDays++;
              if (log.status === 'Present' && !log.minute_late) {
                deptData.perfectEmployees.add(log.staff_id);
              }
            }

            if (log.status === 'Late' || (log.minute_late && log.minute_late > 0)) {
              deptData.lateDays++;
            }
          });
        } catch (error) {
          console.error(`Failed to fetch logs for ${date}:`, error);
        }
      }

      // Convert to department compliance array
      const deptCompliance: DepartmentCompliance[] = Array.from(deptMap.entries()).map(([dept, data]) => {
        const attendanceRate = data.totalDays > 0 ? (data.presentDays / data.totalDays) * 100 : 0;
        const punctualityRate = data.presentDays > 0 ? ((data.presentDays - data.lateDays) / data.presentDays) * 100 : 0;
        const riskCount = data.allEmployees.size - data.perfectEmployees.size;

        return {
          department: dept,
          attendanceRate,
          punctualityRate,
          perfectAttendanceCount: data.perfectEmployees.size,
          riskCount,
          trend: 0 // Will be calculated if we have historical data
        };
      });

      setDepartmentData(deptCompliance.sort((a, b) => b.attendanceRate - a.attendanceRate));

      // Process risk employees
      const risks: EmployeeRisk[] = absentees
        .filter(emp => emp.department)
        .map(emp => {
          const totalPossibleDays = dates.length;
          const absentDays = emp.absent_count;
          const attendanceRate = ((totalPossibleDays - absentDays) / totalPossibleDays) * 100;
          
          let status: 'critical' | 'warning' | 'watch' = 'watch';
          if (attendanceRate < 85) status = 'critical';
          else if (attendanceRate < 95) status = 'warning';

          return {
            staff_id: emp.staff_id,
            name: emp.name,
            department: emp.department,
            attendanceRate,
            lateCount: 0, // Would need additional API
            status
          };
        })
        .filter(emp => emp.status === 'critical' || emp.status === 'warning')
        .slice(0, 15);

      setRiskEmployees(risks);

    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 dark:text-green-400";
    if (rate >= 85) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getComplianceZone = (rate: number) => {
    if (rate >= 95) return { label: "Excellent", color: "bg-green-500" };
    if (rate >= 85) return { label: "Good", color: "bg-yellow-500" };
    return { label: "Needs Improvement", color: "bg-red-500" };
  };

  const getRiskBadge = (status: 'critical' | 'warning' | 'watch') => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-600 gap-1"><AlertTriangle className="h-3 w-3" />Warning</Badge>;
      default:
        return <Badge variant="secondary">Watch</Badge>;
    }
  };

  const trendChange = currentMonthTrend.rate - previousMonthTrend.rate;

  return (
    <div className="space-y-6">
      {/* Overall Compliance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(currentMonthTrend.rate)}`}>
              {currentMonthTrend.rate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              {trendChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p className="text-xs text-muted-foreground">
                {trendChange >= 0 ? '+' : ''}{trendChange.toFixed(1)}% from last month
              </p>
            </div>
            <Progress value={currentMonthTrend.rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
            <div className={`h-3 w-3 rounded-full ${getComplianceZone(currentMonthTrend.rate).color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getComplianceZone(currentMonthTrend.rate).label}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {currentMonthTrend.present} / {currentMonthTrend.total} total attendance days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Indicators</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {riskEmployees.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Employees below compliance threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Filter */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'faculty' | 'staff')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value={viewType} className="space-y-6 mt-6">
          {/* Department Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Department Compliance Rankings</CardTitle>
              <CardDescription>
                Attendance and punctuality scores by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading compliance data...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Punctuality Rate</TableHead>
                      <TableHead>Perfect Attendance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentData.map((dept, idx) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-bold">#{idx + 1}</TableCell>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getComplianceColor(dept.attendanceRate)}`}>
                              {dept.attendanceRate.toFixed(1)}%
                            </span>
                            <Progress value={dept.attendanceRate} className="w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${getComplianceColor(dept.punctualityRate)}`}>
                            {dept.punctualityRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Award className="h-3 w-3" />
                            {dept.perfectAttendanceCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getComplianceZone(dept.attendanceRate).color}>
                            {getComplianceZone(dept.attendanceRate).label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Risk Employees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                At-Risk Employees
              </CardTitle>
              <CardDescription>
                Employees requiring intervention due to low compliance rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading risk data...</p>
              ) : riskEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ✓ No employees at risk - all within compliance thresholds
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskEmployees.map((emp) => (
                      <TableRow key={emp.staff_id}>
                        <TableCell className="font-mono text-sm">{emp.staff_id}</TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${getComplianceColor(emp.attendanceRate)}`}>
                            {emp.attendanceRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>{getRiskBadge(emp.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
