import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

// Mock data - ready for Supabase integration
const mockAvgTimeData = [
  { department: "CCS", avgTimeIn: "8:15 AM", avgTimeOut: "5:30 PM", avgTimeInMinutes: 495, avgTimeOutMinutes: 1050 },
  { department: "CHS", avgTimeIn: "8:05 AM", avgTimeOut: "5:15 PM", avgTimeInMinutes: 485, avgTimeOutMinutes: 1035 },
  { department: "CCJ", avgTimeIn: "8:20 AM", avgTimeOut: "5:45 PM", avgTimeInMinutes: 500, avgTimeOutMinutes: 1065 },
  { department: "COE", avgTimeIn: "8:10 AM", avgTimeOut: "5:20 PM", avgTimeInMinutes: 490, avgTimeOutMinutes: 1040 },
  { department: "HR", avgTimeIn: "7:55 AM", avgTimeOut: "5:05 PM", avgTimeInMinutes: 475, avgTimeOutMinutes: 1025 },
];

const mockLateMinutesData = [
  { month: "Jan", avgLate: 12 },
  { month: "Feb", avgLate: 15 },
  { month: "Mar", avgLate: 10 },
  { month: "Apr", avgLate: 18 },
  { month: "May", avgLate: 20 },
  { month: "Jun", avgLate: 25 },
  { month: "Jul", avgLate: 28 },
  { month: "Aug", avgLate: 22 },
  { month: "Sep", avgLate: 19 },
  { month: "Oct", avgLate: 14 },
  { month: "Nov", avgLate: 16 },
  { month: "Dec", avgLate: 13 },
];

interface TimeAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TimeAnalytics({ selectedDate, dateRange }: TimeAnalyticsProps) {
  const [timeGraphType, setTimeGraphType] = useState<"bar" | "line">("bar");
  const [lateGraphType, setLateGraphType] = useState<"bar" | "line">("line");

  const TimeChart = timeGraphType === "bar" ? BarChart : LineChart;
  const TimeElement = timeGraphType === "bar" ? Bar : Line;
  
  const LateChart = lateGraphType === "bar" ? BarChart : LineChart;
  const LateElement = lateGraphType === "bar" ? Bar : Line;

  return (
    <>
      {/* Average Time-In/Time-Out per Department */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Average Time-In / Time-Out per Department</CardTitle>
              <CardDescription>See which departments consistently come in earlier/later</CardDescription>
            </div>
            <Select value={timeGraphType} onValueChange={(val) => setTimeGraphType(val as "bar" | "line")}>
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
            <TimeChart data={mockAvgTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <TimeElement 
                type={timeGraphType === "line" ? "monotone" : undefined}
                dataKey="avgTimeInMinutes" 
                fill="hsl(var(--primary))" 
                stroke="hsl(var(--primary))"
                name="Avg Time In" 
              />
              <TimeElement 
                type={timeGraphType === "line" ? "monotone" : undefined}
                dataKey="avgTimeOutMinutes" 
                fill="hsl(var(--success))" 
                stroke="hsl(var(--success))"
                name="Avg Time Out" 
              />
            </TimeChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Average Minutes Late per Month */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Average Minutes Late per Month</CardTitle>
              <CardDescription>Identify trends (e.g., rainy season = more lates)</CardDescription>
            </div>
            <Select value={lateGraphType} onValueChange={(val) => setLateGraphType(val as "bar" | "line")}>
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
            <LateChart data={mockLateMinutesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <LateElement 
                type={lateGraphType === "line" ? "monotone" : undefined}
                dataKey="avgLate" 
                fill="hsl(var(--warning))" 
                stroke="hsl(var(--warning))"
                name="Avg Late (mins)" 
              />
            </LateChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department-wise Average Late Minutes */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Department-wise Average Late Minutes</CardTitle>
          <CardDescription>Which department needs attendance policy reinforcement?</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockAvgTimeData.map(d => ({ ...d, avgLate: Math.floor(Math.random() * 30) + 5 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgLate" fill="hsl(var(--destructive))" name="Avg Late (mins)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
