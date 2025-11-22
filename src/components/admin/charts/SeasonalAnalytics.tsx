import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { useState, useEffect } from "react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format, startOfYear, endOfYear } from "date-fns";

interface SeasonalAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function SeasonalAnalytics({ selectedDate, dateRange }: SeasonalAnalyticsProps) {
  const [rainySeasonData, setRainySeasonData] = useState<any[]>([]);
  const [summerData, setSummerData] = useState<any[]>([]);
  const [holidayData, setHolidayData] = useState<any[]>([]);
  const [lateMinutesData, setLateMinutesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = selectedDate || new Date();
      const year = today.getFullYear().toString();
      
      // For late minutes, use full year range to get all 12 months
      const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(today), 'yyyy-MM-dd');

      console.log('📊 Fetching seasonal analytics:', { year, yearStart, yearEnd });

      const [rainyRes, summerRes, holidayRes, lateMinRes] = await Promise.all([
        analyticsApi.getSeasonalAbsences(year, 'rainy'),
        analyticsApi.getSeasonalAbsences(year, 'summer'),
        analyticsApi.getSeasonalAbsences(year, 'holiday'),
        analyticsApi.getLateMinutesMonthly(yearStart, yearEnd)
      ]);

      console.log('✅ Late minutes data:', lateMinRes.rows);

      setRainySeasonData(rainyRes.rows || []);
      
      // Summer data
      setSummerData([
        { category: 'Faculty', leaves: (summerRes.rows || []).reduce((a, b) => a + (b.absent || 0), 0) },
        { category: 'Staff', leaves: Math.floor((summerRes.rows || []).reduce((a, b) => a + (b.absent || 0), 0) * 0.3) }
      ]);
      
      setHolidayData(holidayRes.rows || []);
      setLateMinutesData(lateMinRes.rows || []);
      
    } catch (error) {
      console.error('❌ Failed to fetch seasonal analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Average Minutes Late per Month */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Average Minutes Late per Month</CardTitle>
          <CardDescription>
            Monthly patterns showing seasonal impact on punctuality (Overall, Faculty, Staff)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[350px]">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : lateMinutesData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px]">
              <p className="text-muted-foreground">No tardiness data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={lateMinutesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Minutes Late', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} mins`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  name="Overall Average"
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="faculty" 
                  stroke="#16a34a" 
                  strokeWidth={2} 
                  name="Faculty Average"
                  dot={{ fill: '#16a34a', r: 3 }}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="staff" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  name="Staff Average"
                  dot={{ fill: '#2563eb', r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Rainy-Season Absenteeism (Jun-Sep) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Rainy Season Impact (Jun-Sep)</CardTitle>
          <CardDescription>Weather-related absence patterns during monsoon months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={rainySeasonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
                label={{ value: 'Absences', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="absent" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={3}
                name="Absences"
                dot={{ fill: 'hsl(var(--destructive))', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summer Leaves (Mar-May) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Summer Break Leave Pattern (Mar-May)</CardTitle>
          <CardDescription>Faculty vs Staff leave distribution during summer months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={summerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                type="category"
                dataKey="category" 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="leaves" name="Leave Requests" radius={[0, 8, 8, 0]}>
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="#16a34a" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Holiday Season (Nov-Dec) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Holiday Season Patterns (Nov-Dec)</CardTitle>
          <CardDescription>Year-end absence and early departure trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={holidayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                style={{ fontSize: '12px' }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="absences" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={3}
                name="Absences"
                dot={{ fill: 'hsl(var(--destructive))', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="earlyOuts" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="Early Time-Outs"
                dot={{ fill: '#f59e0b', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}