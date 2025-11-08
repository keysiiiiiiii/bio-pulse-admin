import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

// Mock data
const mockStatusData = [
  { name: "Present", value: 45, color: "hsl(var(--success))" },
  { name: "Late", value: 8, color: "hsl(var(--warning))" },
  { name: "Absent", value: 5, color: "hsl(var(--destructive))" },
  { name: "Leave", value: 3, color: "hsl(var(--primary))" },
];

const mockWorkHoursData = [
  { name: "Under Schedule", value: 5 },
  { name: "On Schedule", value: 45 },
  { name: "Over Schedule", value: 11 },
];

const mockDayOfWeekData = [
  { day: "Mon", present: 52, late: 8, absent: 1 },
  { day: "Tue", present: 55, late: 4, absent: 2 },
  { day: "Wed", present: 54, late: 5, absent: 2 },
  { day: "Thu", present: 53, late: 6, absent: 2 },
  { day: "Fri", present: 48, late: 10, absent: 3 },
];

const mockFacultyStaffData = [
  { category: "Faculty", present: 85, late: 10, absent: 5 },
  { category: "Staff", present: 90, late: 7, absent: 3 },
];

interface StatusAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function StatusAnalytics({ selectedDate, dateRange }: StatusAnalyticsProps) {
  const [statusGraphType, setStatusGraphType] = useState<"pie" | "bar">("pie");
  const [dayGraphType, setDayGraphType] = useState<"bar" | "line">("bar");

  return (
    <>
      {/* Distribution of STATUS */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Distribution of STATUS</CardTitle>
              <CardDescription>Overview of attendance reliability</CardDescription>
            </div>
            <Select value={statusGraphType} onValueChange={(val) => setStatusGraphType(val as "pie" | "bar")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {statusGraphType === "pie" ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Work Hours vs. Schedule */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Work Hours vs. Schedule</CardTitle>
          <CardDescription>Are employees under- or over-working?</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockWorkHoursData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="hsl(var(--destructive))" />
                <Cell fill="hsl(var(--success))" />
                <Cell fill="hsl(var(--primary))" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Day-of-Week Analysis */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Day-of-Week Analysis</CardTitle>
              <CardDescription>Are Mondays or Fridays the worst attendance days?</CardDescription>
            </div>
            <Select value={dayGraphType} onValueChange={(val) => setDayGraphType(val as "bar" | "line")}>
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
            <BarChart data={mockDayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="hsl(var(--success))" name="Present" />
              <Bar dataKey="late" fill="hsl(var(--warning))" name="Late" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Faculty vs. Staff Attendance Patterns */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Faculty vs. Staff Attendance Patterns</CardTitle>
          <CardDescription>Compare punctuality and absenteeism</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockFacultyStaffData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="hsl(var(--success))" name="Present %" />
              <Bar dataKey="late" fill="hsl(var(--warning))" name="Late %" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
