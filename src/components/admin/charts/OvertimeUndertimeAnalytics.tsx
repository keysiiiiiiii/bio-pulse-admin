import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

// Mock data for different employee types
const mockOTUTData = {
  "Job Order": [
    { staffId: "23-2025-0201", name: "Juan Dela Cruz", totalOT: 45.5, totalUT: 2.0, trend: "frequent_ot" },
    { staffId: "23-2025-0202", name: "Maria Santos", totalOT: 38.0, totalUT: 5.5, trend: "balanced" },
    { staffId: "23-2025-0203", name: "Pedro Reyes", totalOT: 52.5, totalUT: 0.5, trend: "frequent_ot" },
    { staffId: "23-2025-0204", name: "Ana Garcia", totalOT: 12.0, totalUT: 18.5, trend: "frequent_ut" },
    { staffId: "23-2025-0205", name: "Jose Ramos", totalOT: 28.5, totalUT: 8.0, trend: "balanced" },
  ],
  "Contract of Service": [
    { staffId: "23-2025-0301", name: "Carlos Mendoza", totalOT: 60.0, totalUT: 1.0, trend: "frequent_ot" },
    { staffId: "23-2025-0302", name: "Lisa Fernandez", totalOT: 42.5, totalUT: 4.5, trend: "frequent_ot" },
    { staffId: "23-2025-0303", name: "Mark Torres", totalOT: 15.0, totalUT: 22.0, trend: "frequent_ut" },
    { staffId: "23-2025-0304", name: "Sofia Cruz", totalOT: 35.5, totalUT: 6.5, trend: "balanced" },
    { staffId: "23-2025-0305", name: "Daniel Reyes", totalOT: 48.0, totalUT: 2.5, trend: "frequent_ot" },
  ],
  "Regular Admin": [
    { staffId: "23-2025-0401", name: "Carmen Lopez", totalOT: 55.5, totalUT: 0.5, trend: "frequent_ot" },
    { staffId: "23-2025-0402", name: "Roberto Gomez", totalOT: 62.0, totalUT: 1.5, trend: "frequent_ot" },
    { staffId: "23-2025-0403", name: "Elena Martinez", totalOT: 18.5, totalUT: 15.0, trend: "frequent_ut" },
    { staffId: "23-2025-0404", name: "Miguel Ramirez", totalOT: 44.0, totalUT: 5.0, trend: "frequent_ot" },
    { staffId: "23-2025-0405", name: "Isabel Torres", totalOT: 30.5, totalUT: 9.5, trend: "balanced" },
  ],
  "Regular Faculty": [
    { staffId: "23-2025-0501", name: "Francisco Silva", totalOT: 70.0, totalUT: 0.0, trend: "frequent_ot" },
    { staffId: "23-2025-0502", name: "Luisa Herrera", totalOT: 65.5, totalUT: 1.0, trend: "frequent_ot" },
    { staffId: "23-2025-0503", name: "Antonio Castro", totalOT: 58.0, totalUT: 2.5, trend: "frequent_ot" },
    { staffId: "23-2025-0504", name: "Patricia Morales", totalOT: 22.0, totalUT: 12.5, trend: "frequent_ut" },
    { staffId: "23-2025-0505", name: "Ricardo Ortiz", totalOT: 48.5, totalUT: 4.0, trend: "frequent_ot" },
  ],
  "Part-time Faculty": [
    { staffId: "23-2025-0601", name: "Beatriz Navarro", totalOT: 25.0, totalUT: 8.5, trend: "balanced" },
    { staffId: "23-2025-0602", name: "Diego Campos", totalOT: 32.5, totalUT: 5.0, trend: "balanced" },
    { staffId: "23-2025-0603", name: "Gabriela Flores", totalOT: 15.5, totalUT: 18.0, trend: "frequent_ut" },
    { staffId: "23-2025-0604", name: "Rodrigo Vega", totalOT: 28.0, totalUT: 7.5, trend: "balanced" },
    { staffId: "23-2025-0605", name: "Valentina Ruiz", totalOT: 38.5, totalUT: 3.5, trend: "frequent_ot" },
  ],
};

interface OvertimeUndertimeAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function OvertimeUndertimeAnalytics({ selectedDate, dateRange }: OvertimeUndertimeAnalyticsProps) {
  const [employeeType, setEmployeeType] = useState<keyof typeof mockOTUTData>("Job Order");
  const [selectedEmployee, setSelectedEmployee] = useState<typeof mockOTUTData[keyof typeof mockOTUTData][0] | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const currentData = mockOTUTData[employeeType];

  const handleEmployeeClick = (employee: typeof currentData[0]) => {
    setSelectedEmployee(employee);
    setDetailsOpen(true);
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case "frequent_ot":
        return <Badge className="bg-primary">Frequent OT</Badge>;
      case "frequent_ut":
        return <Badge variant="destructive">Frequent UT</Badge>;
      case "balanced":
        return <Badge variant="secondary">Balanced</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Overtime / Undertime Analytics</CardTitle>
              <CardDescription>
                Track employees with consistent overtime or undertime patterns
              </CardDescription>
            </div>
            <Select value={employeeType} onValueChange={(val) => setEmployeeType(val as keyof typeof mockOTUTData)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Job Order">Job Order</SelectItem>
                <SelectItem value="Contract of Service">Contract of Service</SelectItem>
                <SelectItem value="Regular Admin">Regular Admin</SelectItem>
                <SelectItem value="Regular Faculty">Regular Faculty</SelectItem>
                <SelectItem value="Part-time Faculty">Part-time Faculty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Total OT (hrs)</TableHead>
                <TableHead>Total UT (hrs)</TableHead>
                <TableHead>Pattern</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((employee) => (
                <TableRow 
                  key={employee.staffId} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEmployeeClick(employee)}
                >
                  <TableCell className="font-mono text-sm">{employee.staffId}</TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">{employee.totalOT.toFixed(1)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-destructive">{employee.totalUT.toFixed(1)}</span>
                  </TableCell>
                  <TableCell>{getTrendBadge(employee.trend)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OT/UT Details</DialogTitle>
            <DialogDescription>
              Detailed overtime and undertime information for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Staff ID</p>
                  <p className="font-mono font-medium">{selectedEmployee.staffId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedEmployee.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Overtime</p>
                  <p className="text-2xl font-bold text-primary">{selectedEmployee.totalOT.toFixed(1)} hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Undertime</p>
                  <p className="text-2xl font-bold text-destructive">{selectedEmployee.totalUT.toFixed(1)} hrs</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Pattern</p>
                  {getTrendBadge(selectedEmployee.trend)}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Additional Insights</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Average OT per occurrence: {(selectedEmployee.totalOT / 8).toFixed(1)} hrs</li>
                  <li>• Average UT per occurrence: {(selectedEmployee.totalUT / 4).toFixed(1)} hrs</li>
                  <li>• Net hours variance: {(selectedEmployee.totalOT - selectedEmployee.totalUT).toFixed(1)} hrs</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
