import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDate } from "date-fns";

interface DayOfWeekComparisonProps {
  selectedDate?: Date;
}

interface WeekData {
  day: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

export function DayOfWeekComparison({ selectedDate }: DayOfWeekComparisonProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentDate = selectedDate || new Date();
    setSelectedMonth(format(currentDate, 'MMMM yyyy'));
    fetchWeeklyComparison(currentDate);
  }, [selectedDate]);

  const fetchWeeklyComparison = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Initialize week buckets
      const weeks: Record<number, Record<string, number>> = {
        1: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 },
        2: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 },
        3: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 },
        4: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 },
      };

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const day of allDays) {
        const dayOfWeek = getDay(day);
        const dateNum = getDate(day);
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const weekNumber = Math.min(Math.ceil(dateNum / 7), 4);
        const dayName = dayNames[dayOfWeek];

        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          const attendanceCount = logs.filter(log => log.time_in).length;
          weeks[weekNumber][dayName] += attendanceCount;
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      const chartData: WeekData[] = [
        { day: 'Mon', week1: weeks[1].Mon, week2: weeks[2].Mon, week3: weeks[3].Mon, week4: weeks[4].Mon },
        { day: 'Tue', week1: weeks[1].Tue, week2: weeks[2].Tue, week3: weeks[3].Tue, week4: weeks[4].Tue },
        { day: 'Wed', week1: weeks[1].Wed, week2: weeks[2].Wed, week3: weeks[3].Wed, week4: weeks[4].Wed },
        { day: 'Thu', week1: weeks[1].Thu, week2: weeks[2].Thu, week3: weeks[3].Thu, week4: weeks[4].Thu },
        { day: 'Fri', week1: weeks[1].Fri, week2: weeks[2].Fri, week3: weeks[3].Fri, week4: weeks[4].Fri },
      ];

      setWeekData(chartData);
    } catch (error) {
      console.error('Failed to fetch weekly comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Day-of-Week Analysis (Week 1 vs Week 2 vs Week 3 vs Week 4)</CardTitle>
            <CardDescription>Compare attendance patterns across different weeks</CardDescription>
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
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
