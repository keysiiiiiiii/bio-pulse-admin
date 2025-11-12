import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

// Mock data
const mockStatusData = [
  { name: "Present", value: 45, color: "hsl(var(--success))" },
  { name: "Late", value: 8, color: "hsl(var(--warning))" },
  { name: "Absent", value: 5, color: "hsl(var(--destructive))" },
  { name: "Leave", value: 3, color: "hsl(var(--primary))" },
];

// Mock data for Day-of-Week Analysis (combined for line graph)
const mockDayOfWeekCombined = [
  { day: "Mon", week1: 52, week2: 50, week3: 51, week4: 49 },
  { day: "Tue", week1: 55, week2: 54, week3: 56, week4: 53 },
  { day: "Wed", week1: 54, week2: 53, week3: 55, week4: 52 },
  { day: "Thu", week1: 53, week2: 52, week3: 54, week4: 51 },
  { day: "Fri", week1: 48, week2: 46, week3: 47, week4: 45 },
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

      {/* Day-of-Week Analysis - Line Graph comparing 4 weeks */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Day-of-Week Analysis (Week 1 vs Week 2 vs Week 3 vs Week 4)</CardTitle>
          <CardDescription>Compare attendance patterns across different weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockDayOfWeekCombined}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="week1" stroke="#2563eb" strokeWidth={2} name="Week 1" />
              <Line type="monotone" dataKey="week2" stroke="#16a34a" strokeWidth={2} name="Week 2" />
              <Line type="monotone" dataKey="week3" stroke="#f97316" strokeWidth={2} name="Week 3" />
              <Line type="monotone" dataKey="week4" stroke="#9333ea" strokeWidth={2} name="Week 4" />
            </LineChart>
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
