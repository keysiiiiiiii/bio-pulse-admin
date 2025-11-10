import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { useState, useEffect } from "react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format } from "date-fns";

interface TrendAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TrendAnalytics({ selectedDate, dateRange }: TrendAnalyticsProps) {
  const [overtimeGraphType, setOvertimeGraphType] = useState<"bar" | "line" | "area">("line");
  const [overtimeData, setOvertimeData] = useState<any[]>([]);
  const [employeeTypeOvertimeData, setEmployeeTypeOvertimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 
                    selectedDate ? format(new Date(selectedDate.getFullYear(), 0, 1), 'yyyy-MM-dd') : 
                    format(new Date(2025, 0, 1), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 
                  selectedDate ? format(new Date(selectedDate.getFullYear(), 11, 31), 'yyyy-MM-dd') : 
                  format(new Date(2025, 11, 31), 'yyyy-MM-dd');

      const [overtimeRes, employeeTypeRes] = await Promise.all([
        analyticsApi.getOvertimeMonthly(start, end),
        analyticsApi.getOvertimeByEmployeeType(start, end)
      ]);

      setOvertimeData(overtimeRes.rows || []);
      setEmployeeTypeOvertimeData(employeeTypeRes.rows || []);
    } catch (error) {
      console.error('Failed to fetch overtime analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overtime Trends by Month */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Overtime Trends by Month</CardTitle>
              <CardDescription>
                Discover which months require extra effort (e.g., enrollment, grading weeks)
              </CardDescription>
            </div>
            <Select
              value={overtimeGraphType}
              onValueChange={(val) => setOvertimeGraphType(val as "bar" | "line" | "area")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {overtimeGraphType === "bar" ? (
              <BarChart data={overtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="overtime" fill="hsl(var(--primary))" name="Overtime Hours" />
              </BarChart>
            ) : overtimeGraphType === "line" ? (
              <LineChart data={overtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Overtime Hours"
                />
              </LineChart>
            ) : (
              <AreaChart data={overtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="overtime"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                  name="Overtime Hours"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee Type vs. Overtime Hours */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Employee Type vs. Overtime Hours</CardTitle>
          <CardDescription>Which roles work extra hours regularly?</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employeeTypeOvertimeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="type" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="overtime" fill="hsl(var(--primary))" name="Avg Overtime (hrs)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
