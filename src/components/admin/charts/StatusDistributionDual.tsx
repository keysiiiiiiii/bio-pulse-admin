import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { attendanceApi } from "@/services/api";

interface StatusDistributionDualProps {
  selectedDate?: Date;
  selectedMonth?: Date;
}

const COLORS = {
  present: "#22c55e",
  late: "#f97316",
  absent: "#ef4444",
  leave: "#3b82f6",
};

const COLLEGE_WHITELIST = new Set([
  'CED - College of Education',
  'CCS - College of Computing Studies',
  'CCJ - College of Criminal Justice',
  'CBA - College of Business Administration',
  'CAS - College of Arts and Sciences',
  'CHS - College of Health Sciences',
  'COL - College of Law',
  'CL - College of Law',
  'CBPM - College of Business and Public Management',
  'Gen Ed - General Education',
  'NSTP - National Service Training Program'
]);

export function StatusDistributionDual({ selectedDate, selectedMonth }: StatusDistributionDualProps) {
  const [chartType, setChartType] = useState<"pie" | "bar" | "stacked">("pie");
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    const date = selectedMonth || selectedDate || new Date();
    setCurrentMonth(format(date, "MMMM yyyy"));
    fetchStatusDistribution(date);
  }, [selectedDate, selectedMonth]);

  const fetchStatusDistribution = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Fetch all logs for the month
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

      // Separate faculty and staff
      const facultyLogs = allLogs.filter(log => {
        const dept = (log.department || '').trim();
        return COLLEGE_WHITELIST.has(dept);
      });

      const staffLogs = allLogs.filter(log => {
        const dept = (log.department || '').trim();
        return !COLLEGE_WHITELIST.has(dept);
      });

      // Calculate status counts for faculty
      const facultyStats = {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
      };

      facultyLogs.forEach(log => {
        if (log.on_leave || log.leave_type) {
          facultyStats.leave++;
        } else if (!log.time_in) {
          facultyStats.absent++;
        } else if (log.status === 'late' || log.attendance_status === 'late') {
          facultyStats.late++;
        } else {
          facultyStats.present++;
        }
      });

      // Calculate status counts for staff
      const staffStats = {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
      };

      staffLogs.forEach(log => {
        if (log.on_leave || log.leave_type) {
          staffStats.leave++;
        } else if (!log.time_in) {
          staffStats.absent++;
        } else if (log.status === 'late' || log.attendance_status === 'late') {
          staffStats.late++;
        } else {
          staffStats.present++;
        }
      });

      // Calculate totals
      const facultyTotal = facultyStats.present + facultyStats.late + facultyStats.absent + facultyStats.leave;
      const staffTotal = staffStats.present + staffStats.late + staffStats.absent + staffStats.leave;

      // Format data for charts
      const formatData = (stats: typeof facultyStats, total: number) => [
        { 
          name: "Present", 
          value: stats.present, 
          percentage: total > 0 ? ((stats.present / total) * 100).toFixed(1) : "0.0",
          color: COLORS.present 
        },
        { 
          name: "Late", 
          value: stats.late, 
          percentage: total > 0 ? ((stats.late / total) * 100).toFixed(1) : "0.0",
          color: COLORS.late 
        },
        { 
          name: "Absent", 
          value: stats.absent, 
          percentage: total > 0 ? ((stats.absent / total) * 100).toFixed(1) : "0.0",
          color: COLORS.absent 
        },
        { 
          name: "Leave", 
          value: stats.leave, 
          percentage: total > 0 ? ((stats.leave / total) * 100).toFixed(1) : "0.0",
          color: COLORS.leave 
        },
      ].filter(item => item.value > 0);

      setFacultyData(formatData(facultyStats, facultyTotal));
      setStaffData(formatData(staffStats, staffTotal));

    } catch (error) {
      console.error('Failed to fetch status distribution:', error);
      setFacultyData([]);
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderPieChart = (data: any[], title: string) => (
    <div className="flex-1">
      <h3 className="text-center font-semibold mb-4 text-lg">{title}</h3>
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any, name: any, props: any) => [value, `${props.payload.percentage}%`]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  const renderBarChart = () => {
    const combinedData = [
      {
        type: "Faculty",
        Present: facultyData.find(d => d.name === "Present")?.value || 0,
        Late: facultyData.find(d => d.name === "Late")?.value || 0,
        Absent: facultyData.find(d => d.name === "Absent")?.value || 0,
        Leave: facultyData.find(d => d.name === "Leave")?.value || 0,
      },
      {
        type: "Staff",
        Present: staffData.find(d => d.name === "Present")?.value || 0,
        Late: staffData.find(d => d.name === "Late")?.value || 0,
        Absent: staffData.find(d => d.name === "Absent")?.value || 0,
        Leave: staffData.find(d => d.name === "Leave")?.value || 0,
      }
    ];

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Present" fill={COLORS.present} />
          <Bar dataKey="Late" fill={COLORS.late} />
          <Bar dataKey="Absent" fill={COLORS.absent} />
          <Bar dataKey="Leave" fill={COLORS.leave} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderStackedBarChart = () => {
    const combinedData = [
      {
        type: "Faculty",
        Present: facultyData.find(d => d.name === "Present")?.value || 0,
        Late: facultyData.find(d => d.name === "Late")?.value || 0,
        Absent: facultyData.find(d => d.name === "Absent")?.value || 0,
        Leave: facultyData.find(d => d.name === "Leave")?.value || 0,
      },
      {
        type: "Staff",
        Present: staffData.find(d => d.name === "Present")?.value || 0,
        Late: staffData.find(d => d.name === "Late")?.value || 0,
        Absent: staffData.find(d => d.name === "Absent")?.value || 0,
        Leave: staffData.find(d => d.name === "Leave")?.value || 0,
      }
    ];

    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Present" stackId="a" fill={COLORS.present} />
          <Bar dataKey="Late" stackId="a" fill={COLORS.late} />
          <Bar dataKey="Absent" stackId="a" fill={COLORS.absent} />
          <Bar dataKey="Leave" stackId="a" fill={COLORS.leave} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Distribution of STATUS</CardTitle>
            <CardDescription>Monthly attendance breakdown by employment type</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={chartType} onValueChange={(val) => setChartType(val as "pie" | "bar" | "stacked")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="stacked">Stacked Bar Chart</SelectItem>
              </SelectContent>
            </Select>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              Month: {currentMonth}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {chartType === "pie" && (
              <div className="flex flex-col md:flex-row gap-6">
                {renderPieChart(facultyData, "FACULTY")}
                {renderPieChart(staffData, "STAFF")}
              </div>
            )}
            {chartType === "bar" && renderBarChart()}
            {chartType === "stacked" && renderStackedBarChart()}
          </>
        )}
      </CardContent>
    </Card>
  );
}