import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { scheduleApi, attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDate } from "date-fns";

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentDate = selectedDate || new Date();
    setSelectedMonth(format(currentDate, 'MMMM yyyy'));
    fetchWeeklyTrends(currentDate);
  }, [selectedDate, staffUserId]);

  const fetchWeeklyTrends = async (date: Date) => {
    setLoading(true);
    try {
      // Fetch user's schedule
      const scheduleResponse = await scheduleApi.getSchedule(staffUserId);
      const userSchedule = scheduleResponse.schedules || [];

      if (userSchedule.length === 0) {
        setWeekData([]);
        setLoading(false);
        return;
      }

      // Get scheduled days
      const scheduledDays = userSchedule.map((s: any) => s.day_of_week);

      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Initialize week buckets for all days
      const weeks: Record<number, Record<string, number>> = {
        1: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        2: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        3: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        4: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        5: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
      };

      // Fetch attendance for each day
      for (const day of allDays) {
        const dayOfWeek = getDay(day);
        const dayName = DAY_NAMES[dayOfWeek];

        // Only process scheduled days
        if (!scheduledDays.includes(dayOfWeek)) {
          continue;
        }

        const dateNum = getDate(day);
        const weekNumber = Math.min(Math.ceil(dateNum / 7), 5);
        const dateStr = format(day, 'yyyy-MM-dd');

        try {
          const logs = await attendanceApi.getLogs(dateStr);
          const userLog = logs.find((log: any) => log.staff_user_id === staffUserId);
          
          // Count as 1 if present, 0 if absent
          if (userLog?.time_in) {
            weeks[weekNumber][dayName] += 1;
          }
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      // Determine how many weeks actually have data
      const maxWeek = Math.max(
        ...allDays.map(day => Math.min(Math.ceil(getDate(day) / 7), 5))
      );

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
        if (maxWeek === 5) {
          dataPoint.week5 = weeks[5][dayName];
        }

        chartData.push(dataPoint);
      });

      setWeekData(chartData);
    } catch (error) {
      console.error('Failed to fetch personal weekly trends:', error);
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
          <div className="text-center py-8 text-muted-foreground">No schedule set for this user</div>
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
      </CardContent>
    </Card>
  );
}
