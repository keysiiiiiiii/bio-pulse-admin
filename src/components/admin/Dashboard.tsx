import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { AttendanceChart } from "./charts/AttendanceChart";
import { LeaveAnalyticsChart } from "./charts/LeaveAnalyticsChart";
import { TardinessChart } from "./charts/TardinessChart";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { attendanceApi, staffApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch attendance stats and total staff count
        const [attendanceStats, staffList] = await Promise.all([
          attendanceApi.getStats(today),
          staffApi.getAll()
        ]);

        setStats({
          total: staffList.length,
          present: attendanceStats.present,
          absent: attendanceStats.absent,
          late: attendanceStats.late,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: error instanceof Error ? error.message : "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  const statCards = [
    { title: "Total Staff", value: stats.total, icon: Users, color: "text-primary" },
    { title: "Present Today", value: stats.present, icon: UserCheck, color: "text-success" },
    { title: "Absent Today", value: stats.absent, icon: UserX, color: "text-destructive" },
    { title: "Tardy Today", value: stats.late, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Analytics and insights for attendance management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar and Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
            <CardDescription>Choose dates to filter analytics</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Daily Attendance Breakdown</CardTitle>
            <CardDescription>Present, Absent, and Tardy distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart />
          </CardContent>
        </Card>
      </div>

      {/* Leave Analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Leave Analytics</CardTitle>
          <CardDescription>Monthly leave requests by type</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveAnalyticsChart />
        </CardContent>
      </Card>

      {/* Tardiness Analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Tardiness Trends</CardTitle>
          <CardDescription>Weekly tardiness patterns across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <TardinessChart />
        </CardContent>
      </Card>
    </div>
  );
}
