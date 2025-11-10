import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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

  return (
    <>
      {/* Average Time-In/Time-Out per Department */}
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
          <div className="space-y-4">
            {avgTimeData.map((dept) => (
              <div key={dept.department} className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium">{dept.department}</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-muted-foreground">
                    In: <span className="text-foreground font-medium">{dept.avgTimeIn}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Out: <span className="text-foreground font-medium">{dept.avgTimeOut}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Minutes Late per Month - 3 Lines */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Average Minutes Late per Month</CardTitle>
          <CardDescription>
            Identify trends (e.g., rainy season = more lates) - Total, Faculty, Staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lateMinutesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* ✅ Fixed colors and correct average logic */}
              <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2} name="Overall Average" />
              <Line type="monotone" dataKey="faculty" stroke="#16a34a" strokeWidth={2} name="Faculty Average" />
              <Line type="monotone" dataKey="staff" stroke="#2563eb" strokeWidth={2} name="Staff Average" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department-wise Average Late Minutes with Top Individuals */}
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
