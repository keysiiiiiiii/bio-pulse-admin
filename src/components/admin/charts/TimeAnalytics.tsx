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
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock data - Dynamic departments/colleges
const mockAvgTimeDataFaculty = [
  { department: "CCS", avgTimeIn: "8:10 AM", avgTimeOut: "5:05 PM" },
  { department: "CHS", avgTimeIn: "8:25 AM", avgTimeOut: "5:12 PM" },
  { department: "CCJ", avgTimeIn: "8:15 AM", avgTimeOut: "5:08 PM" },
  { department: "CED", avgTimeIn: "8:20 AM", avgTimeOut: "5:10 PM" },
  { department: "NSTP", avgTimeIn: "8:05 AM", avgTimeOut: "5:00 PM" },
  { department: "GE", avgTimeIn: "8:18 AM", avgTimeOut: "5:07 PM" },
  { department: "CBPM", avgTimeIn: "8:22 AM", avgTimeOut: "5:15 PM" },
  { department: "CL", avgTimeIn: "8:12 AM", avgTimeOut: "5:03 PM" },
  { department: "CAS", avgTimeIn: "8:17 AM", avgTimeOut: "5:09 PM" },
];

const mockAvgTimeDataStaff = [
  { department: "HR", avgTimeIn: "8:15 AM", avgTimeOut: "5:10 PM" },
  { department: "Clinic", avgTimeIn: "8:05 AM", avgTimeOut: "5:00 PM" },
  { department: "Security", avgTimeIn: "7:50 AM", avgTimeOut: "5:20 PM" },
  { department: "Library", avgTimeIn: "8:20 AM", avgTimeOut: "5:15 PM" },
  { department: "Canteen", avgTimeIn: "7:55 AM", avgTimeOut: "5:18 PM" },
  { department: "Cleaning Service", avgTimeIn: "7:45 AM", avgTimeOut: "5:25 PM" },
];

// ✅ Correct mock data: Total = (Faculty + Staff) / 2
const rawLateMinutesData = [
  { month: "Jan", faculty: 15, staff: 13 },
  { month: "Feb", faculty: 18, staff: 16 },
  { month: "Mar", faculty: 13, staff: 11 },
  { month: "Apr", faculty: 22, staff: 18 },
  { month: "May", faculty: 17, staff: 15 },
  { month: "Jun", faculty: 24, staff: 20 },
  { month: "Jul", faculty: 26, staff: 22 },
  { month: "Aug", faculty: 20, staff: 18 },
  { month: "Sep", faculty: 16, staff: 14 },
  { month: "Oct", faculty: 14, staff: 12 },
  { month: "Nov", faculty: 19, staff: 17 },
  { month: "Dec", faculty: 23, staff: 19 },
];

// ✅ Compute average instead of total
const mockLateMinutesData = rawLateMinutesData.map((item) => ({
  ...item,
  total: (item.faculty + item.staff) / 2,
}));

const mockDeptLateMinutesDataFaculty = [
  { department: "CCS", avgLateMinutes: 20 },
  { department: "CHS", avgLateMinutes: 22 },
  { department: "CCJ", avgLateMinutes: 18 },
  { department: "CED", avgLateMinutes: 19 },
  { department: "NSTP", avgLateMinutes: 15 },
  { department: "GE", avgLateMinutes: 17 },
  { department: "CBPM", avgLateMinutes: 21 },
  { department: "CL", avgLateMinutes: 16 },
  { department: "CAS", avgLateMinutes: 18 },
];

const mockDeptLateMinutesDataStaff = [
  { department: "Security", avgLateMinutes: 25 },
  { department: "HR", avgLateMinutes: 18 },
  { department: "Library", avgLateMinutes: 15 },
  { department: "Clinic", avgLateMinutes: 12 },
  { department: "Canteen", avgLateMinutes: 20 },
  { department: "Cleaning Service", avgLateMinutes: 22 },
];

// Top individuals with late minutes
const mockTopLateIndividualsFaculty = [
  { name: "Juan Dela Cruz", staffId: "23-2025-0001", college: "CCS", avgLateMinutes: 35, trend: "increasing" },
  { name: "Maria Santos", staffId: "23-2025-0005", college: "CHS", avgLateMinutes: 32, trend: "stable" },
  { name: "Pedro Reyes", staffId: "23-2025-0012", college: "CCJ", avgLateMinutes: 30, trend: "decreasing" },
  { name: "Ana Garcia", staffId: "23-2025-0018", college: "CED", avgLateMinutes: 28, trend: "increasing" },
  { name: "Jose Ramos", staffId: "23-2025-0025", college: "CBPM", avgLateMinutes: 27, trend: "stable" },
];

const mockTopLateIndividualsStaff = [
  { name: "Carlos Mendoza", staffId: "23-2025-0101", department: "Security", avgLateMinutes: 40, trend: "increasing" },
  { name: "Lisa Fernandez", staffId: "23-2025-0105", department: "HR", avgLateMinutes: 35, trend: "stable" },
  { name: "Mark Torres", staffId: "23-2025-0110", department: "Library", avgLateMinutes: 32, trend: "increasing" },
  { name: "Sofia Cruz", staffId: "23-2025-0115", department: "Clinic", avgLateMinutes: 28, trend: "decreasing" },
  { name: "Daniel Reyes", staffId: "23-2025-0120", department: "Canteen", avgLateMinutes: 26, trend: "stable" },
];

interface TimeAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TimeAnalytics({ selectedDate, dateRange }: TimeAnalyticsProps) {
  const [avgTimeViewType, setAvgTimeViewType] = useState<"faculty" | "staff">("faculty");
  const [lateMinutesViewType, setLateMinutesViewType] = useState<"faculty" | "staff">("faculty");
  const [showTopIndividuals, setShowTopIndividuals] = useState(false);

  const avgTimeData = avgTimeViewType === "faculty" ? mockAvgTimeDataFaculty : mockAvgTimeDataStaff;
  const deptLateMinutesData =
    lateMinutesViewType === "faculty" ? mockDeptLateMinutesDataFaculty : mockDeptLateMinutesDataStaff;
  const topLateIndividuals =
    lateMinutesViewType === "faculty" ? mockTopLateIndividualsFaculty : mockTopLateIndividualsStaff;

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
            <LineChart data={mockLateMinutesData}>
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

          <div className="border-t pt-4">
            <button
              onClick={() => setShowTopIndividuals(!showTopIndividuals)}
              className="text-sm font-medium text-primary hover:underline mb-3"
            >
              {showTopIndividuals ? "Hide" : "Show"} Top Individuals with Highest Late Minutes
            </button>

            {showTopIndividuals && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>{lateMinutesViewType === "faculty" ? "College" : "Department"}</TableHead>
                    <TableHead>Avg Late (mins)</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLateIndividuals.map((individual) => (
                    <TableRow key={individual.staffId}>
                      <TableCell className="font-mono text-sm">{individual.staffId}</TableCell>
                      <TableCell className="font-medium">{individual.name}</TableCell>
                      <TableCell>
                        {lateMinutesViewType === "faculty" ? individual.college : individual.department}
                      </TableCell>
                      <TableCell className="font-bold text-destructive">{individual.avgLateMinutes}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            individual.trend === "increasing"
                              ? "bg-destructive/20 text-destructive"
                              : individual.trend === "decreasing"
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {individual.trend}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
