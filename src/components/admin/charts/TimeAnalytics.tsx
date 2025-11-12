import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format } from "date-fns";


interface TimeAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TimeAnalytics({ selectedDate, dateRange }: TimeAnalyticsProps) {
  const [avgTimeViewType, setAvgTimeViewType] = useState<"faculty" | "staff">("faculty");
  const [lateMinutesViewType, setLateMinutesViewType] = useState<"faculty" | "staff">("faculty");
  const [showTopIndividuals, setShowTopIndividuals] = useState(false);
  
  const [avgTimeData, setAvgTimeData] = useState<any[]>([]);
  const [lateMinutesData, setLateMinutesData] = useState<any[]>([]);
  const [deptLateMinutesData, setDeptLateMinutesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange, avgTimeViewType, lateMinutesViewType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 
                    selectedDate ? format(new Date(selectedDate.getFullYear(), 0, 1), 'yyyy-MM-dd') : 
                    format(new Date(2025, 0, 1), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 
                  selectedDate ? format(new Date(selectedDate.getFullYear(), 11, 31), 'yyyy-MM-dd') : 
                  format(new Date(2025, 11, 31), 'yyyy-MM-dd');

      const [avgTimeRes, lateMinRes, deptLateRes] = await Promise.all([
        analyticsApi.getAvgTimePerDept(start, end, avgTimeViewType),
        analyticsApi.getLateMinutesMonthly(start, end),
        analyticsApi.getDeptLateMinutes(start, end, lateMinutesViewType)
      ]);

      setAvgTimeData(avgTimeRes.rows || []);
      setLateMinutesData(lateMinRes.rows || []);
      setDeptLateMinutesData(deptLateRes.rows || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for pie chart
  const pieChartData = avgTimeData.map((dept, index) => ({
    name: dept.department,
    value: 1, // Each department gets equal representation
    avgTimeIn: dept.avgTimeIn,
    avgTimeOut: dept.avgTimeOut,
  }));

  const COLORS = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0891b2', '#dc2626', '#ca8a04', '#ec4899'];

  return (
    <>
      {/* Average Time-In/Time-Out per Department - PIE CHART */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                Average Time-In / Time-Out per {avgTimeViewType === "faculty" ? "College" : "Department"}
              </CardTitle>
              <CardDescription>
                See which {avgTimeViewType === "faculty" ? "colleges" : "departments"} consistently come in earlier/later
              </CardDescription>
            </div>
            <Select value={avgTimeViewType} onValueChange={(val) => setAvgTimeViewType(val as "faculty" | "staff")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faculty">Faculty (Colleges)</SelectItem>
                <SelectItem value="staff">Staff (Departments)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name }) => name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ payload }) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">In: {data.avgTimeIn}</p>
                        <p className="text-sm text-muted-foreground">Out: {data.avgTimeOut}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-3">
              {avgTimeData.map((dept, index) => (
                <div key={dept.department} className="flex items-center gap-3 p-2 border rounded-lg">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{dept.department}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>In: {dept.avgTimeIn}</span>
                      <span>Out: {dept.avgTimeOut}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department-wise Average Late Minutes */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Department-wise Average Late Minutes</CardTitle>
              <CardDescription>
                Which {lateMinutesViewType === "faculty" ? "college" : "department"} needs attendance policy
                reinforcement?
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={lateMinutesViewType} onValueChange={(val) => setLateMinutesViewType(val as "faculty" | "staff")}>
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
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptLateMinutesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="department" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgLateMinutes" fill="hsl(var(--destructive))" name="Avg Late (mins)" />
            </BarChart>
          </ResponsiveContainer>

        </CardContent>
      </Card>
    </>
  );
}
