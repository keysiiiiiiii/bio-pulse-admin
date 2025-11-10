import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CalendarDays, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { staffApi } from "@/services/api/staffApi";

const performanceData = [
  { month: "Jul", present: 20, absent: 2 },
  { month: "Aug", present: 22, absent: 1 },
  { month: "Sep", present: 21, absent: 2 },
  { month: "Oct", present: 23, absent: 0 },
  { month: "Nov", present: 18, absent: 1 },
];

const leaveData = [
  { name: "Used", value: 7, color: "hsl(var(--destructive))" },
  { name: "Remaining", value: 8, color: "hsl(var(--primary))" },
];

export const StaffDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { user } = useAuth();
  const [leaveCredits, setLeaveCredits] = useState({ used: 7, remaining: 8 });
  
  useEffect(() => {
    if (user?.staff_id) {
      fetchLeaveCredits();
    }
  }, [user]);
  
  const fetchLeaveCredits = async () => {
    try {
      if (user?.staff_id) {
        const data = await staffApi.getLeaveCredits(user.staff_id);
        setLeaveCredits({
          used: data.vacation_used + data.sick_used,
          remaining: data.vacation_balance + data.sick_balance
        });
      }
    } catch (error) {
      console.error("Failed to fetch leave credits", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Your performance analytics and attendance overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Present</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">104 days</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <CalendarDays className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6 days</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tardiness</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 times</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8 days</div>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Leave Credits Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Credits Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                used: { label: "Used", color: "hsl(var(--destructive))" },
                remaining: { label: "Remaining", color: "hsl(var(--primary))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              present: { label: "Present", color: "hsl(var(--primary))" },
              absent: { label: "Absent", color: "hsl(var(--destructive))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="present" fill="hsl(var(--primary))" />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
