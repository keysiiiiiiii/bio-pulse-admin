import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';

interface TardinessChartProps {
  selectedMonth: Date;
}

// ✅ College whitelist for faculty identification
const COLLEGE_WHITELIST = new Set([
  'CED - College of Education',
  'CCS - College of Computing Science',
  'CCJ - College of Criminal Justice',
  'CBA - College of Business Administration',
  'CAS - College of Arts and Sciences',
  'CHS - College of Health Sciences',
  'COL - College of Law',
  'NSTP - National Service Training Program'
]);

export function TardinessChart({ selectedMonth }: TardinessChartProps) {
  const [viewType, setViewType] = useState<"faculty" | "staff">("faculty");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = [
    "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#9333ea",
    "#0ea5e9", "#f43f5e", "#84cc16", "#e11d48", "#06b6d4",
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        const monthStart = format(firstDay, 'yyyy-MM-dd');
        const monthEnd = format(lastDay, 'yyyy-MM-dd');
        
        console.log('Fetching tardiness data for:', { monthStart, monthEnd, viewType });
        
        // ✅ FIXED: Query with proper status filter
        const { data: logs, error } = await supabase
          .from('attendance_logs')
          .select(`
            week_of_year,
            minute_late,
            att_date,
            attendance_status,
            staff_users!inner (
              employee_type,
              department
            )
          `)
          .gte('att_date', monthStart)
          .lte('att_date', monthEnd)
          .eq('attendance_status', 'late') // ✅ Only get late records
          .gt('minute_late', 0);
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Fetched tardiness logs:', logs);
        
        if (!logs || logs.length === 0) {
          console.log('No tardiness data found');
          setData([]);
          return;
        }
        
        // Normalize staff_users
        const normalizedLogs = logs.map(log => ({
          ...log,
          staff_user: Array.isArray(log.staff_users) ? log.staff_users[0] : log.staff_users,
        }));
        
        // ✅ FIXED: Filter by college whitelist (faculty) or non-whitelist (staff)
        const filteredLogs = normalizedLogs.filter(log => {
          const dept = (log.staff_user?.department || '').trim();
          const isFaculty = COLLEGE_WHITELIST.has(dept);
          
          if (viewType === 'faculty') {
            return isFaculty;
          } else {
            return !isFaculty; // Staff = not in college whitelist
          }
        });
        
        console.log('Filtered logs by role:', filteredLogs);
        
        if (filteredLogs.length === 0) {
          setData([]);
          return;
        }
        
        // Get unique weeks
        const weeksInData = [...new Set(filteredLogs.map(d => d.week_of_year))].filter(w => w != null).sort((a, b) => a - b);
        
        // Get unique departments/colleges
        const uniqueDepts = [...new Set(
          filteredLogs
            .map(log => log.staff_user?.department)
            .filter(Boolean)
        )].sort();
        
        console.log('Weeks:', weeksInData);
        console.log('Departments/Colleges:', uniqueDepts);
        
        if (weeksInData.length === 0) {
          setData([]);
          return;
        }
        
        // Transform data: Per week, total minutes late per department/college
        const transformedData = weeksInData.map(week => {
          const weekData: any = { week: `Week ${week}` };
          
          uniqueDepts.forEach(dept => {
            const totalMinutes = filteredLogs
              .filter(log => 
                log.week_of_year === week && 
                log.staff_user?.department === dept
              )
              .reduce((sum, log) => sum + (log.minute_late || 0), 0);
            
            weekData[dept] = totalMinutes;
          });
          
          return weekData;
        });
        
        console.log('Transformed tardiness data:', transformedData);
        setData(transformedData);
      } catch (error) {
        console.error('Error fetching tardiness data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, viewType]);

  const getDataKeys = () => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'week');
    return keys;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Tardiness Trends</CardTitle>
            <CardDescription>
              Weekly tardiness comparison by {viewType === "faculty" ? "college" : "department"} for {format(selectedMonth, "MMMM yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={chartType} onValueChange={(val) => setChartType(val as "bar" | "line")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewType} onValueChange={(val) => setViewType(val as "faculty" | "staff")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading tardiness data...
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tardiness data for {viewType === 'faculty' ? 'faculty' : 'staff'} in {format(selectedMonth, "MMMM yyyy")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {chartType === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis label={{ value: 'Minutes Late', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {getDataKeys().map((key, index) => (
                  <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis label={{ value: 'Minutes Late', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {getDataKeys().map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}