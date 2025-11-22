import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { scheduleApi, attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek, isSameWeek, startOfDay } from "date-fns";

interface PersonalWeeklyTrendsProps {
  staffUserId: number;
  selectedDate?: Date;
}

interface WeekData {
  day: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5?: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PersonalWeeklyTrends({ staffUserId, selectedDate }: PersonalWeeklyTrendsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [tardinessCount, setTardinessCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentDate = selectedDate || new Date();
    setSelectedMonth(format(currentDate, 'MMMM yyyy'));
    fetchWeeklyTrends(currentDate);
  }, [selectedDate, staffUserId]);

  const getWeekNumber = (date: Date, monthStart: Date): number => {
    // Get all weeks in the month starting from Sunday
    const weeks: Date[] = [];
    let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    // Generate up to 6 possible weeks
    for (let i = 0; i < 6; i++) {
      weeks.push(currentWeekStart);
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    // Find which week this date belongs to
    for (let i = 0; i < weeks.length; i++) {
      if (isSameWeek(date, weeks[i], { weekStartsOn: 0 })) {
        return i + 1;
      }
    }
    
    return 1; // Fallback
  };

  const fetchWeeklyTrends = async (date: Date) => {
    setLoading(true);
    try {
      console.log('📊 Fetching trends for staff_user_id:', staffUserId);

      // Fetch user's schedule
      const scheduleResponse = await scheduleApi.getSchedule(staffUserId);
      const userSchedule = scheduleResponse.schedules || [];

      console.log('📅 User schedule:', userSchedule);

      if (userSchedule.length === 0) {
        console.warn('⚠️ No schedule found for user');
        setWeekData([]);
        setWeeklyRate(0);
        setMonthlyRate(0);
        setTardinessCount(0);
        setLoading(false);
        return;
      }

      // Get scheduled days
      const scheduledDays = userSchedule.map((s: any) => s.day_of_week);
      console.log('📆 Scheduled days:', scheduledDays);

      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Initialize week buckets
      const weeks: Record<number, Record<string, number>> = {
        1: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        2: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        3: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        4: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        5: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
      };

      // Track for current week rate
      const today = startOfDay(new Date());
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      // Fetch all attendance logs for the month at once
      const monthlyLogs = await attendanceApi.getByMonth(
        staffUserId,
        date.getMonth() + 1,
        date.getFullYear()
      );

      console.log('📋 Monthly logs received:', monthlyLogs);

      // Create a map of date -> log for quick lookup
      const logsMap = new Map();
      monthlyLogs.forEach((log: any) => {
        const logDate = log.att_date || format(new Date(log.time_in || ''), 'yyyy-MM-dd');
        logsMap.set(logDate, log);
      });

      // Count scheduled days and present days
      let totalScheduledDays = 0;
      let totalPresentDays = 0;
      let presentThisWeek = 0;
      let scheduledThisWeek = 0;
      let maxWeek = 1;

      // Process each day in the month
      for (const day of allDays) {
        const dayOfWeek = getDay(day);
        const dayName = DAY_NAMES[dayOfWeek];

        // Only process scheduled days
        if (!scheduledDays.includes(dayOfWeek)) {
          continue;
        }

        // Don't count future days
        if (day > today) {
          continue;
        }

        totalScheduledDays++;

        const weekNumber = getWeekNumber(day, monthStart);
        maxWeek = Math.max(maxWeek, weekNumber);
        const dateStr = format(day, 'yyyy-MM-dd');

        const userLog = logsMap.get(dateStr);
        
        // Count as 1 if present (has time_in), 0 if absent
        if (userLog?.time_in) {
          weeks[weekNumber][dayName] += 1;
          totalPresentDays++;
        }

        // Calculate for current week
        if (day >= weekStart && day <= weekEnd) {
          scheduledThisWeek++;
          if (userLog?.time_in) {
            presentThisWeek++;
          }
        }
      }

      console.log('📊 Attendance summary:', {
        totalScheduledDays,
        totalPresentDays,
        scheduledThisWeek,
        presentThisWeek,
        maxWeek
      });

      // Build chart data only for scheduled days
      const chartData: WeekData[] = [];
      scheduledDays.sort().forEach((dayNum: number) => {
        const dayName = DAY_NAMES[dayNum];
        const dataPoint: WeekData = {
          day: dayName,
          week1: weeks[1][dayName],
          week2: weeks[2][dayName],
          week3: weeks[3][dayName],
          week4: weeks[4][dayName],
        };

        // Add week 5 if it exists
        if (maxWeek >= 5) {
          dataPoint.week5 = weeks[5][dayName];
        }

        chartData.push(dataPoint);
      });

      setWeekData(chartData);

      // Calculate weekly rate (for current week)
      const weekRate = scheduledThisWeek > 0 ? (presentThisWeek / scheduledThisWeek) * 100 : 0;
      setWeeklyRate(Math.round(weekRate));

      // Calculate monthly rate (based on actual scheduled days that have passed)
      const monthRate = totalScheduledDays > 0 ? (totalPresentDays / totalScheduledDays) * 100 : 0;
      setMonthlyRate(Math.round(monthRate));

      // Calculate tardiness count
      const lateCount = monthlyLogs.filter((log: any) => {
        const status = (log.status || log.attendance_status || '').toLowerCase();
        return status === 'late';
      }).length;
      setTardinessCount(lateCount);

      console.log('✅ Trends calculated:', {
        weeklyRate: Math.round(weekRate),
        monthlyRate: Math.round(monthRate),
        tardinessCount: lateCount
      });

    } catch (error) {
      console.error('❌ Failed to fetch personal weekly trends:', error);
      setWeekData([]);
      setWeeklyRate(0);
      setMonthlyRate(0);
      setTardinessCount(0);
    } finally {
      setLoading(false);
    }
  };

  const hasWeek5 = weekData.length > 0 && weekData[0].week5 !== undefined;

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Personal Attendance Trends</CardTitle>
          <CardDescription>Analyze attendance patterns across different weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading trends...</div>
        </CardContent>
      </Card>
    );
  }

  if (weekData.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Personal Attendance Trends</CardTitle>
          <CardDescription>Analyze attendance patterns across different weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No schedule set for this user or no attendance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Personal Attendance Trends (Week 1 vs Week 2 vs Week 3 vs Week 4{hasWeek5 ? ' vs Week 5' : ''})</CardTitle>
            <CardDescription>Compare personal attendance patterns across different weeks (scheduled days only)</CardDescription>
          </div>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            Month: {selectedMonth}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="week1" stroke="#3b82f6" name="Week 1" strokeWidth={2} />
            <Line type="monotone" dataKey="week2" stroke="#22c55e" name="Week 2" strokeWidth={2} />
            <Line type="monotone" dataKey="week3" stroke="#f97316" name="Week 3" strokeWidth={2} />
            <Line type="monotone" dataKey="week4" stroke="#a855f7" name="Week 4" strokeWidth={2} />
            {hasWeek5 && (
              <Line type="monotone" dataKey="week5" stroke="#ec4899" name="Week 5" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Weekly Rate</p>
            <p className="text-xl font-bold text-success">{weeklyRate}%</p>
            <p className="text-xs text-muted-foreground">(Current week)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Rate</p>
            <p className="text-xl font-bold text-success">{monthlyRate}%</p>
            <p className="text-xs text-muted-foreground">(Month to date)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tardiness Count</p>
            <p className="text-xl font-bold text-warning">{tardinessCount}</p>
            <p className="text-xs text-muted-foreground">(This month)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}