import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDate } from "date-fns";

interface DayOfWeekComparisonProps {
  selectedDate?: Date;
  selectedMonth?: Date; // ✅ ADD this prop to sync with Dashboard's month selector
}

interface WeekData {
  day: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5?: number;
}

export function DayOfWeekComparison({ selectedDate, selectedMonth }: DayOfWeekComparisonProps) {
  const [displayMonth, setDisplayMonth] = useState<string>("");
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Listen to BOTH selectedDate AND selectedMonth changes
  useEffect(() => {
    // Use selectedMonth if provided (from Dashboard dropdown), otherwise use selectedDate
    const currentDate = selectedMonth || selectedDate || new Date();
    const monthStr = format(currentDate, 'MMMM yyyy');

    console.log(`🔍 DayOfWeek - Date/Month changed:`, {
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'undefined',
      selectedMonth: selectedMonth ? format(selectedMonth, 'yyyy-MM-dd') : 'undefined',
      using: selectedMonth ? 'selectedMonth' : 'selectedDate',
      monthStr,
      previousMonth: displayMonth
    });

    // Update displayed month and fetch data
    setDisplayMonth(monthStr);
    fetchWeeklyComparison(currentDate);
  }, [selectedDate, selectedMonth]); // ✅ Watch BOTH props

  const fetchWeeklyComparison = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      console.log(`📊 Fetching weekly comparison for ${format(date, 'MMMM yyyy')}`);
      console.log(`   Range: ${format(monthStart, 'yyyy-MM-dd')} to ${format(monthEnd, 'yyyy-MM-dd')}`);

      // Initialize week buckets (up to 5 weeks possible in a month)
      const weeks: Record<number, Record<string, number>> = {
        1: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        2: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        3: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        4: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
        5: { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 },
      };

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const day of allDays) {
        const dayOfWeek = getDay(day);
        const dateNum = getDate(day);

        // Calculate week number (1-5)
        const weekNumber = Math.min(Math.ceil(dateNum / 7), 5);
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

      // Determine how many weeks actually have data
      const maxWeek = Math.max(
        ...allDays.map(day => Math.min(Math.ceil(getDate(day) / 7), 5))
      );

      console.log(`✅ Max week in month: ${maxWeek}`);

      // Build chart data for all 7 days
      const chartData: WeekData[] = [
        { day: 'Sun', week1: weeks[1].Sun, week2: weeks[2].Sun, week3: weeks[3].Sun, week4: weeks[4].Sun },
        { day: 'Mon', week1: weeks[1].Mon, week2: weeks[2].Mon, week3: weeks[3].Mon, week4: weeks[4].Mon },
        { day: 'Tue', week1: weeks[1].Tue, week2: weeks[2].Tue, week3: weeks[3].Tue, week4: weeks[4].Tue },
        { day: 'Wed', week1: weeks[1].Wed, week2: weeks[2].Wed, week3: weeks[3].Wed, week4: weeks[4].Wed },
        { day: 'Thu', week1: weeks[1].Thu, week2: weeks[2].Thu, week3: weeks[3].Thu, week4: weeks[4].Thu },
        { day: 'Fri', week1: weeks[1].Fri, week2: weeks[2].Fri, week3: weeks[3].Fri, week4: weeks[4].Fri },
        { day: 'Sat', week1: weeks[1].Sat, week2: weeks[2].Sat, week3: weeks[3].Sat, week4: weeks[4].Sat },
      ];

      // Add week 5 if it exists
      if (maxWeek === 5) {
        chartData.forEach(item => {
          item.week5 = weeks[5][item.day];
        });
      }

      console.log('✅ Chart data:', chartData);
      setWeekData(chartData);
    } catch (error) {
      console.error('Failed to fetch weekly comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which weeks to show in the chart
  const hasWeek5 = weekData.length > 0 && weekData[0].week5 !== undefined;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Day-of-Week Analysis</CardTitle>
            <CardDescription>Compare attendance patterns across different weeks (including weekends)</CardDescription>
          </div>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            Month: {displayMonth}
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
              {hasWeek5 && (
                <Line type="monotone" dataKey="week5" stroke="#ec4899" name="Week 5" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}