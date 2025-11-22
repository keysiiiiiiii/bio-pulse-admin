import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { scheduleApi, attendanceApi } from "@/services/api";
import { startOfWeek, endOfWeek, format, eachDayOfInterval, getDay } from "date-fns";

interface PersonalWeeklyAttendanceProps {
  staffUserId: number;
}

interface ChartData {
  day: string;
  status: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PersonalWeeklyAttendance({ staffUserId }: PersonalWeeklyAttendanceProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [tardinessCount, setTardinessCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonalAttendance();
  }, [staffUserId]);

  const fetchPersonalAttendance = async () => {
    setLoading(true);
    try {
      // Fetch user's schedule
      const scheduleResponse = await scheduleApi.getSchedule(staffUserId);
      const userSchedule = scheduleResponse.schedules || [];

      if (userSchedule.length === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      // Get scheduled days
      const scheduledDays = userSchedule.map((s: any) => s.day_of_week);

      // Get current week's date range
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      // Fetch attendance for each scheduled day
      const attendancePromises = weekDays.map(async (day) => {
        const dayOfWeek = getDay(day);
        const dayName = DAY_NAMES[dayOfWeek];

        // Only include scheduled days
        if (!scheduledDays.includes(dayOfWeek)) {
          return null;
        }

        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          const userLog = logs.find((log: any) => log.staff_user_id === staffUserId);

          // Calculate status percentage (100 if present/late, 0 if absent)
          const status = userLog?.time_in ? 100 : 0;

          return { day: dayName, status, log: userLog };
        } catch (error) {
          console.error(`Failed to fetch log for ${dateStr}:`, error);
          return { day: dayName, status: 0, log: null };
        }
      });

      const results = await Promise.all(attendancePromises);
      const validResults = results.filter((r) => r !== null) as Array<{ day: string; status: number; log: any }>;

      // Build chart data
      const data = validResults.map(({ day, status }) => ({ day, status }));
      setChartData(data);

      // Calculate weekly rate (this week)
      const presentThisWeek = validResults.filter((r) => r.status === 100).length;
      const scheduledThisWeek = validResults.length;
      const weekRate = scheduledThisWeek > 0 ? (presentThisWeek / scheduledThisWeek) * 100 : 0;
      setWeeklyRate(Math.round(weekRate));

      // Calculate monthly rate (last 30 days)
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const monthlyLogs = await attendanceApi.getByMonth(
        staffUserId,
        today.getMonth() + 1,
        today.getFullYear()
      );

      // Count scheduled days in the past 30 days
      const scheduledDaysCount = scheduledDays.length * 4; // Approx 4 weeks
      const presentDays = monthlyLogs.filter((log: any) => log.time_in).length;
      const monthRate = scheduledDaysCount > 0 ? (presentDays / scheduledDaysCount) * 100 : 0;
      setMonthlyRate(Math.round(monthRate));

      // Count tardiness
      const lateCount = monthlyLogs.filter((log: any) => 
        log.attendance_status === 'late' || log.status === 'Late'
      ).length;
      setTardinessCount(lateCount);

    } catch (error) {
      console.error('Error fetching personal attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Weekly Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Weekly Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No schedule set for this user</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          Weekly Attendance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="status" stroke="hsl(var(--success))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Weekly Rate</p>
            <p className="text-xl font-bold text-success">{weeklyRate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Rate</p>
            <p className="text-xl font-bold text-success">{monthlyRate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tardiness Count</p>
            <p className="text-xl font-bold text-warning">{tardinessCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
