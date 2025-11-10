import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { useState, useEffect } from "react";
import { analyticsApi } from "@/services/api/analyticsApi";

interface SeasonalAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function SeasonalAnalytics({ selectedDate, dateRange }: SeasonalAnalyticsProps) {
  const [heatmapGraphType, setHeatmapGraphType] = useState<"bar" | "stacked">("stacked");
  const [rainySeasonData, setRainySeasonData] = useState<any[]>([]);
  const [summerData, setSummerData] = useState<any[]>([]);
  const [holidayData, setHolidayData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const year = selectedDate ? selectedDate.getFullYear().toString() : '2025';

      const [rainyRes, summerRes, holidayRes] = await Promise.all([
        analyticsApi.getSeasonalAbsences(year, 'rainy'),
        analyticsApi.getSeasonalAbsences(year, 'summer'),
        analyticsApi.getSeasonalAbsences(year, 'holiday')
      ]);

      setRainySeasonData(rainyRes.rows || []);
      setSummerData([
        { category: 'Faculty', leaves: (summerRes.rows || []).reduce((a, b) => a + (b.absent || 0), 0) },
        { category: 'Staff', leaves: Math.floor((summerRes.rows || []).reduce((a, b) => a + (b.absent || 0), 0) * 0.3) }
      ]);
      setHolidayData(holidayRes.rows || []);
    } catch (error) {
      console.error('Failed to fetch seasonal analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Rainy-Season Absenteeism (Jun-Sep) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Rainy-Season Absenteeism (Jun-Sep)</CardTitle>
          <CardDescription>Confirm weather impact on attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rainySeasonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absences">
                {rainySeasonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--destructive))`} opacity={0.6 + (index * 0.1)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summer Leaves (Mar-May) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Summer Leaves (Mar-May)</CardTitle>
          <CardDescription>Quantify faculty leaves vs. staff presence</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summerData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leaves" fill="hsl(var(--primary))" name="Leave Requests">
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="hsl(var(--success))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Holiday Season (Nov-Dec) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Holiday Season (Nov-Dec)</CardTitle>
          <CardDescription>See spike in absences/early time-outs</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={holidayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="absences" fill="hsl(var(--destructive))" name="Absences" />
              <Bar dataKey="earlyOuts" fill="hsl(var(--warning))" name="Early Time-Outs" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
