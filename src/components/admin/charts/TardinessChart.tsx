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

interface TardinessChartProps {
  selectedMonth: Date;
}

export function TardinessChart({ selectedMonth }: TardinessChartProps) {
  const [viewType, setViewType] = useState<"faculty" | "staff">("faculty");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🎨 Color palette
  const colors = [
    "#2563eb", // blue
    "#16a34a", // green
    "#f59e0b", // amber
    "#dc2626", // red
    "#9333ea", // violet
    "#0ea5e9", // sky
    "#f43f5e", // rose
    "#84cc16", // lime
    "#e11d48", // pink-red
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        
        const response = await fetch(`/api/attendance/tardiness-trends?year=${year}&month=${month}&type=${viewType}`);
        if (!response.ok) {
          console.error('Failed to fetch tardiness data');
          setData([]);
          return;
        }
        
        const result = await response.json();
        setData(result);
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
              Weekly tardiness patterns by {viewType === "faculty" ? "college" : "department"} for {format(selectedMonth, "MMMM yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 👇 Chart Type Toggle */}
            <Select value={chartType} onValueChange={(val) => setChartType(val as "bar" | "line")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>

            {/* 👇 Faculty/Staff Toggle */}
            <Select value={viewType} onValueChange={(val) => setViewType(val as "faculty" | "staff")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faculty">Faculty (Colleges)</SelectItem>
                <SelectItem value="staff">Staff (Departments)</SelectItem>
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
            No tardiness data available for {format(selectedMonth, "MMMM yyyy")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            {/* ✅ Conditional Rendering Based on Chart Type */}
            {chartType === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis label={{ value: 'Late Minutes', angle: -90, position: 'insideLeft' }} />
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
                <YAxis label={{ value: 'Late Minutes', angle: -90, position: 'insideLeft' }} />
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
