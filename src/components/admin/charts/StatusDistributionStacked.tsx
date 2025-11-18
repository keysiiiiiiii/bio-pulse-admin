import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { attendanceApi } from "@/services/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface StatusDistributionStackedProps {
  selectedDate?: Date;
  selectedMonth?: Date;
}

const COLLEGE_MAP: Record<string, string> = {
  'CCS': 'CCS',
  'CAS': 'CAS',
  'CHS': 'CHS',
  'CCJ': 'CCJ',
  'CED': 'CED',
  'CBPM': 'CBPM',
  'CL': 'CL',
  'Gen Ed': 'Gen Ed',
  'GenEd': 'Gen Ed',
  'NSTP': 'NSTP'
};

const STAFF_DEPARTMENTS = [
  'Canteen',
  'Cleaning Service',
  'Clinic',
  'Library',
  'Security',
  'Human Resource (HR)',
  'Registrar'
];

export function StatusDistributionStacked({ selectedDate, selectedMonth }: StatusDistributionStackedProps) {
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStackedData();
  }, [selectedDate, selectedMonth]);

  const fetchStackedData = async () => {
    setLoading(true);
    try {
      const currentDate = selectedMonth || selectedDate || new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // Initialize data structures
      const facultyByCollege = new Map<string, any>();
      const staffByDept = new Map<string, any>();

      Object.keys(COLLEGE_MAP).forEach(college => {
        facultyByCollege.set(COLLEGE_MAP[college], {
          present: 0,
          late: 0,
          absent: 0,
          leave: 0
        });
      });

      STAFF_DEPARTMENTS.forEach(dept => {
        staffByDept.set(dept, {
          present: 0,
          late: 0,
          absent: 0,
          leave: 0
        });
      });

      // Fetch data for all days in the month
      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const logs = await attendanceApi.getLogs(dateStr);
          
          logs.forEach(log => {
            const isFaculty = log.role === 'Faculty' || log.role === 'Regular Faculty' || log.role === 'Part-Time Faculty';
            
            if (isFaculty) {
              // Map to college
              const college = COLLEGE_MAP[log.department] || 'Other';
              if (facultyByCollege.has(college)) {
                const stats = facultyByCollege.get(college);
                
                if (log.status === 'on_leave' || log.status === 'Leave') {
                  stats.leave++;
                } else if (log.time_in) {
                  if (log.status === 'late' || log.status === 'Late') {
                    stats.late++;
                  } else {
                    stats.present++;
                  }
                } else {
                  stats.absent++;
                }
              }
            } else {
              // Staff - map to department
              if (staffByDept.has(log.department)) {
                const stats = staffByDept.get(log.department);
                
                if (log.status === 'on_leave' || log.status === 'Leave') {
                  stats.leave++;
                } else if (log.time_in) {
                  if (log.status === 'late' || log.status === 'Late') {
                    stats.late++;
                  } else {
                    stats.present++;
                  }
                } else {
                  stats.absent++;
                }
              }
            }
          });
        } catch (error) {
          console.error(`Failed to fetch logs for ${dateStr}:`, error);
        }
      }

      // Convert to chart data format
      const facultyChartData = Array.from(facultyByCollege.entries())
        .filter(([_, stats]) => stats.present + stats.late + stats.absent + stats.leave > 0)
        .map(([college, stats]) => ({
          name: college,
          Present: stats.present,
          Late: stats.late,
          Absent: stats.absent,
          Leave: stats.leave
        }));

      const staffChartData = Array.from(staffByDept.entries())
        .filter(([_, stats]) => stats.present + stats.late + stats.absent + stats.leave > 0)
        .map(([dept, stats]) => ({
          name: dept,
          Present: stats.present,
          Late: stats.late,
          Absent: stats.absent,
          Leave: stats.leave
        }));

      setFacultyData(facultyChartData);
      setStaffData(staffChartData);
    } catch (error) {
      console.error('Failed to fetch stacked distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Faculty Attendance by College</CardTitle>
          <CardDescription>Stacked breakdown of attendance status by college</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : facultyData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No faculty data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={facultyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" stackId="a" fill="#22c55e" />
                <Bar dataKey="Late" stackId="a" fill="#f97316" />
                <Bar dataKey="Absent" stackId="a" fill="#ef4444" />
                <Bar dataKey="Leave" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Staff Attendance by Department</CardTitle>
          <CardDescription>Stacked breakdown of attendance status by department</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : staffData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No staff data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={staffData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" stackId="a" fill="#22c55e" />
                <Bar dataKey="Late" stackId="a" fill="#f97316" />
                <Bar dataKey="Absent" stackId="a" fill="#ef4444" />
                <Bar dataKey="Leave" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
