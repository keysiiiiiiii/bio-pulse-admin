import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface FacultyStaffPatternsStackedProps {
  selectedDate?: Date;
}

interface CollegeStats {
  [college: string]: { present: number; late: number; absent: number };
}

export function FacultyStaffPatternsStacked({ selectedDate }: FacultyStaffPatternsStackedProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentDate = selectedDate || new Date();
    setSelectedMonth(format(currentDate, 'MMMM yyyy'));
    fetchPatterns(currentDate);
  }, [selectedDate]);

  const fetchPatterns = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const facultyStats: CollegeStats = {};
      const staffStats: CollegeStats = {};

      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          
          logs.forEach(log => {
            const isFaculty = log.type === 'Faculty' || log.role === 'Faculty';
            const stats = isFaculty ? facultyStats : staffStats;
            const key = log.department || 'Other';

            if (!stats[key]) {
              stats[key] = { present: 0, late: 0, absent: 0 };
            }

            if (log.time_in) {
              if (log.status === 'late' || log.status === 'Late') {
                stats[key].late++;
              } else {
                stats[key].present++;
              }
            } else {
              stats[key].absent++;
            }
          });
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      // Prepare data for stacked bar chart
      const facultyColleges = Object.keys(facultyStats).sort();
      const staffDepts = Object.keys(staffStats).sort();

      const data = [
        {
          category: "Faculty Present",
          ...Object.fromEntries(facultyColleges.map((c, i) => [
            c,
            facultyStats[c].present
          ])),
        },
        {
          category: "Faculty Late",
          ...Object.fromEntries(facultyColleges.map((c, i) => [
            c,
            facultyStats[c].late
          ])),
        },
        {
          category: "Faculty Absent",
          ...Object.fromEntries(facultyColleges.map((c, i) => [
            c,
            facultyStats[c].absent
          ])),
        },
        {
          category: "Staff Present",
          ...Object.fromEntries(staffDepts.map((d, i) => [
            d,
            staffStats[d].present
          ])),
        },
        {
          category: "Staff Late",
          ...Object.fromEntries(staffDepts.map((d, i) => [
            d,
            staffStats[d].late
          ])),
        },
        {
          category: "Staff Absent",
          ...Object.fromEntries(staffDepts.map((d, i) => [
            d,
            staffStats[d].absent
          ])),
        },
      ];

      setChartData(data);

    } catch (error) {
      console.error('Failed to fetch faculty/staff patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Faculty vs. Staff Attendance Patterns</CardTitle>
            <CardDescription>Compare punctuality and absenteeism</CardDescription>
          </div>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            Month: {selectedMonth}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" stackId="a" fill="#22c55e" />
              <Bar dataKey="Late" stackId="a" fill="#f97316" />
              <Bar dataKey="Absent" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
