import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { API_BASE_URL } from "@/services/api/config";

interface DepartmentInsightsProps {
  selectedDate?: Date;
  dateRange?: { from: Date; to: Date };
}

interface DepartmentData {
  name: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  total: number;
  onTimeRate: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const COLLEGE_MAP: Record<string, string> = {
  CCS: 'College of Computing Studies',
  CAS: 'College of Arts and Sciences',
  CHS: 'College of Health Sciences',
  CCJ: 'College of Criminal Justice',
  CED: 'College of Education',
  CBPM: 'College of Business and Public Management',
  CL: 'College of Law',
  'Gen Ed': 'General Education',
  GenEd: 'General Education',
  NSTP: 'National Service Training Program'
};

const STAFF_DEPARTMENTS = [
  'Canteen',
  'Cleaning Service',
  'Clinic',
  'Library',
  'Security',
  'Human Resource (HR)',
  'Registrar'
];

export function DepartmentInsights({ selectedDate, dateRange }: DepartmentInsightsProps) {
  const [viewType, setViewType] = useState<'faculty' | 'staff'>('faculty');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepartmentData();
  }, [selectedDate, dateRange, viewType]);

  const fetchDepartmentData = async () => {
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
      
      // Group by department
      const grouped: Record<string, { present: number; late: number; absent: number; leave: number; total: number }> = {};

      data.forEach((log: any) => {
        let deptName = log.department || 'Unknown';
        
        // Map faculty departments to colleges
        if (viewType === 'faculty') {
          deptName = COLLEGE_MAP[deptName] || deptName;
          // Skip staff departments when viewing faculty
          if (STAFF_DEPARTMENTS.includes(log.department)) return;
        } else {
          // Only show staff departments when viewing staff
          if (!STAFF_DEPARTMENTS.includes(log.department)) return;
        }

        if (!grouped[deptName]) {
          grouped[deptName] = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
        }

        grouped[deptName].total++;

        if (log.on_leave) {
          grouped[deptName].leave++;
        } else if (log.attendance_status === 'Present') {
          grouped[deptName].present++;
        } else if (log.attendance_status === 'Late') {
          grouped[deptName].late++;
        } else if (log.attendance_status === 'Absent') {
          grouped[deptName].absent++;
        }
      });

      // Convert to array and calculate rates
      const deptArray: DepartmentData[] = Object.entries(grouped).map(([name, stats]) => ({
        name,
        ...stats,
        onTimeRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
      }));

      // Sort by total attendance
      deptArray.sort((a, b) => b.total - a.total);

      setDepartmentData(deptArray);
    } catch (error) {
      console.error('Error fetching department data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={departmentData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="present" fill="#10b981" name="Present" />
        <Bar dataKey="late" fill="#f59e0b" name="Late" />
        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
        <Bar dataKey="leave" fill="#3b82f6" name="Leave" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => {
    const totalStats = departmentData.reduce(
      (acc, dept) => ({
        present: acc.present + dept.present,
        late: acc.late + dept.late,
        absent: acc.absent + dept.absent,
        leave: acc.leave + dept.leave,
      }),
      { present: 0, late: 0, absent: 0, leave: 0 }
    );

    const pieData = [
      { name: 'Present', value: totalStats.present },
      { name: 'Late', value: totalStats.late },
      { name: 'Absent', value: totalStats.absent },
      { name: 'Leave', value: totalStats.leave },
    ];

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Department Insights</CardTitle>
            <CardDescription>
              Attendance breakdown by {viewType === 'faculty' ? 'college' : 'department'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={viewType} onValueChange={(val: 'faculty' | 'staff') => setViewType(val)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(val: 'bar' | 'pie') => setChartType(val)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Loading department insights...</p>
          </div>
        ) : departmentData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">No data available for the selected period</p>
          </div>
        ) : chartType === 'bar' ? (
          renderBarChart()
        ) : (
          renderPieChart()
        )}
      </CardContent>
    </Card>
  );
}
