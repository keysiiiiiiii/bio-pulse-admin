import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { StatusDistributionStacked } from "./StatusDistributionStacked";

interface StatusDistributionDualProps {
  selectedDate?: Date;
  selectedMonth?: Date;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function StatusDistributionDual({ selectedDate, selectedMonth }: StatusDistributionDualProps) {
  const [chartType, setChartType] = useState<"pie" | "bar" | "stacked">("pie");
  const [monthDisplay, setMonthDisplay] = useState<string>("");
  const [facultyData, setFacultyData] = useState<StatusData[]>([]);
  const [staffData, setStaffData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentDate = selectedMonth || selectedDate || new Date();
    setMonthDisplay(format(currentDate, 'MMMM yyyy'));
    fetchStatusData(currentDate);
  }, [selectedDate, selectedMonth]);

  const fetchStatusData = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const facultyStats = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
      const staffStats = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };

      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          
          logs.forEach(log => {
            const isFaculty = log.type === 'Faculty' || log.role === 'Faculty';
            const stats = isFaculty ? facultyStats : staffStats;
            
            stats.total++;
            
            // Check if on leave based on status
            if (log.status === 'on_leave' || log.status === 'Leave') {
              stats.leave++;
            } else if (log.time_in) {
              if (log.status === 'late' || log.status === 'Late') {
                stats.late++;
              } else {
                stats.present++;
              }
            } else {
              stats.absent++;
            }
          });
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      const colors = {
        present: "#22c55e",
        late: "#f97316",
        absent: "#ef4444",
        leave: "#3b82f6",
      };

      setFacultyData([
        { name: "Present", value: facultyStats.present, color: colors.present },
        { name: "Late", value: facultyStats.late, color: colors.late },
        { name: "Absent", value: facultyStats.absent, color: colors.absent },
        { name: "Leave", value: facultyStats.leave, color: colors.leave },
      ].filter(d => d.value > 0));

      setStaffData([
        { name: "Present", value: staffStats.present, color: colors.present },
        { name: "Late", value: staffStats.late, color: colors.late },
        { name: "Absent", value: staffStats.absent, color: colors.absent },
        { name: "Leave", value: staffStats.leave, color: colors.leave },
      ].filter(d => d.value > 0));

    } catch (error) {
      console.error('Failed to fetch status distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPieChart = (data: StatusData[], title: string) => (
    <div className="flex-1">
      <h3 className="text-center font-semibold mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderBarChart = () => {
    const combinedData = [
      {
        category: "Faculty",
        Present: facultyData.find(d => d.name === "Present")?.value || 0,
        Late: facultyData.find(d => d.name === "Late")?.value || 0,
        Absent: facultyData.find(d => d.name === "Absent")?.value || 0,
        Leave: facultyData.find(d => d.name === "Leave")?.value || 0,
      },
      {
        category: "Staff",
        Present: staffData.find(d => d.name === "Present")?.value || 0,
        Late: staffData.find(d => d.name === "Late")?.value || 0,
        Absent: staffData.find(d => d.name === "Absent")?.value || 0,
        Leave: staffData.find(d => d.name === "Leave")?.value || 0,
      },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Present" fill="#22c55e" />
          <Bar dataKey="Late" fill="#f97316" />
          <Bar dataKey="Absent" fill="#ef4444" />
          <Bar dataKey="Leave" fill="#3b82f6" />
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
          <div className="flex gap-2">
            <Select value={chartType} onValueChange={(val) => setChartType(val as "pie" | "bar" | "stacked")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="stacked">Stacked Bar</SelectItem>
              </SelectContent>
            </Select>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              Month: {monthDisplay}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : chartType === "pie" ? (
          <div className="flex gap-4">
            {renderPieChart(facultyData, "FACULTY")}
            {renderPieChart(staffData, "STAFF")}
          </div>
        ) : chartType === "stacked" ? (
          <StatusDistributionStacked selectedDate={selectedDate} selectedMonth={selectedMonth} />
        ) : (
          renderBarChart()
        )}
      </CardContent>
    </Card>
  );
}
