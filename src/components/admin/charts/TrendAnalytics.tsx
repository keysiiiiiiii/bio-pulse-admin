import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { useState } from "react";

// Mock data
const mockOvertimeTrendsData = [
  { month: "Jan", overtime: 120 },
  { month: "Feb", overtime: 110 },
  { month: "Mar", overtime: 95 },
  { month: "Apr", overtime: 130 },
  { month: "May", overtime: 145 },
  { month: "Jun", overtime: 100 },
  { month: "Jul", overtime: 105 },
  { month: "Aug", overtime: 160 },
  { month: "Sep", overtime: 140 },
  { month: "Oct", overtime: 125 },
  { month: "Nov", overtime: 135 },
  { month: "Dec", overtime: 115 },
];

const mockWeeklyAttendanceData = [
  { week: "W1", rate: 92 },
  { week: "W2", rate: 89 },
  { week: "W3", rate: 94 },
  { week: "W4", rate: 91 },
  { week: "W5", rate: 88 },
  { week: "W6", rate: 93 },
  { week: "W7", rate: 95 },
  { week: "W8", rate: 90 },
];

const mockWeeklyOvertimeData = [
  { week: "W1", overtime: 25 },
  { week: "W2", overtime: 30 },
  { week: "W3", overtime: 28 },
  { week: "W4", overtime: 35 },
  { week: "W5", overtime: 32 },
  { week: "W6", overtime: 29 },
  { week: "W7", overtime: 33 },
  { week: "W8", overtime: 31 },
];

const mockEmployeeTypeOvertimeData = [
  { type: "Job Order", overtime: 45 },
  { type: "Contract of Service", overtime: 38 },
  { type: "Regular Admin", overtime: 52 },
  { type: "Regular Faculty", overtime: 60 },
  { type: "Part-time Faculty", overtime: 25 },
];

interface TrendAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TrendAnalytics({ selectedDate, dateRange }: TrendAnalyticsProps) {
  const [overtimeGraphType, setOvertimeGraphType] = useState<"bar" | "line" | "area">("line");
  const [weeklyGraphType, setWeeklyGraphType] = useState<"bar" | "line">("line");
  const [weekOvertimeGraphType, setWeekOvertimeGraphType] = useState<"bar" | "line">("bar");

  return (
    <>
      {/* Overtime Trends by Month */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Overtime Trends by Month</CardTitle>
              <CardDescription>Discover which months require extra effort (e.g., enrollment, grading weeks)</CardDescription>
            </div>
            <Select value={overtimeGraphType} onValueChange={(val) => setOvertimeGraphType(val as "bar" | "line" | "area")}>
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
              <BarChart data={mockOvertimeTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="overtime" fill="hsl(var(--primary))" name="Overtime Hours" />
              </BarChart>
            ) : overtimeGraphType === "line" ? (
              <LineChart data={mockOvertimeTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="overtime" stroke="hsl(var(--primary))" name="Overtime Hours" />
              </LineChart>
            ) : (
              <AreaChart data={mockOvertimeTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="overtime" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="Overtime Hours" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Attendance Rate */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Weekly Attendance Rate</CardTitle>
              <CardDescription>Track improvement/decline across semesters</CardDescription>
            </div>
            <Select value={weeklyGraphType} onValueChange={(val) => setWeeklyGraphType(val as "bar" | "line")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {weeklyGraphType === "bar" ? (
              <BarChart data={mockWeeklyAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="hsl(var(--success))" name="Attendance Rate %" />
              </BarChart>
            ) : (
              <LineChart data={mockWeeklyAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" name="Attendance Rate %" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Week-over-Week Trend of Overtime */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Week-over-Week Trend of Overtime</CardTitle>
              <CardDescription>Operational pressure periods</CardDescription>
            </div>
            <Select value={weekOvertimeGraphType} onValueChange={(val) => setWeekOvertimeGraphType(val as "bar" | "line")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {weekOvertimeGraphType === "bar" ? (
              <BarChart data={mockWeeklyOvertimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="overtime" fill="hsl(var(--primary))" name="Overtime Hours" />
              </BarChart>
            ) : (
              <LineChart data={mockWeeklyOvertimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="overtime" stroke="hsl(var(--primary))" name="Overtime Hours" />
              </LineChart>
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
            <BarChart data={mockEmployeeTypeOvertimeData} layout="vertical">
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
