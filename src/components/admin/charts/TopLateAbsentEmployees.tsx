import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface TopLateAbsentEmployeesProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

// Mock data - replace with actual API call
const mockTopLateAbsent = [
  { rank: 1, staffId: "11-2025-0042", name: "John Dela Cruz", department: "CICS", lateCount: 15, absentCount: 8, status: "Full-Time" },
  { rank: 2, staffId: "23-2025-0021", name: "Maria Santos", department: "CAS", lateCount: 12, absentCount: 6, status: "Part-Time" },
  { rank: 3, staffId: "45-2025-0013", name: "Pedro Reyes", department: "Admin", lateCount: 11, absentCount: 5, status: "COS" },
  { rank: 4, staffId: "66-2025-0055", name: "Ana Garcia", department: "CED", lateCount: 10, absentCount: 4, status: "Job Order" },
  { rank: 5, staffId: "28-2025-0033", name: "Luis Mendoza", department: "COE", lateCount: 9, absentCount: 7, status: "Full-Time" },
];

export function TopLateAbsentEmployees({ selectedDate, dateRange }: TopLateAbsentEmployeesProps) {
  const [topData, setTopData] = useState(mockTopLateAbsent);
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Full-Time": "default",
      "Part-Time": "secondary",
      "COS": "outline",
      "Job Order": "destructive",
    };
    return <Badge variant={statusVariants[status] || "outline"}>{status}</Badge>;
  };

  const getTotalIssues = (lateCount: number, absentCount: number) => lateCount + absentCount;

  return (
    <Card className="shadow-md border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
          Top Late / Absent Employees
        </CardTitle>
        <CardDescription>
          Employees with the highest late and absent occurrences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Staff ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topData.map((employee) => (
              <TableRow key={employee.staffId} className="hover:bg-muted/50">
                <TableCell>
                  <Badge variant={employee.rank <= 3 ? "destructive" : "outline"}>
                    #{employee.rank}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{employee.staffId}</TableCell>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{getStatusBadge(employee.status)}</TableCell>
                <TableCell>
                  <span className="font-bold text-orange-600">{employee.lateCount}</span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-red-600">{employee.absentCount}</span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-destructive">
                    {getTotalIssues(employee.lateCount, employee.absentCount)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
