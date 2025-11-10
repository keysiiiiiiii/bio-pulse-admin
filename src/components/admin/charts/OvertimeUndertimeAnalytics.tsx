import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format } from "date-fns";

interface OvertimeUndertimeAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

const employeeTypes = ["Job Order", "Contract of Service", "Regular Admin", "Regular Faculty", "Part-time Faculty"];

export function OvertimeUndertimeAnalytics({ selectedDate, dateRange }: OvertimeUndertimeAnalyticsProps) {
  const [employeeType, setEmployeeType] = useState(employeeTypes[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange, employeeType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 
                    selectedDate ? format(new Date(selectedDate.getFullYear(), 0, 1), 'yyyy-MM-dd') : 
                    format(new Date(2025, 0, 1), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 
                  selectedDate ? format(new Date(selectedDate.getFullYear(), 11, 31), 'yyyy-MM-dd') : 
                  format(new Date(2025, 11, 31), 'yyyy-MM-dd');

      const res = await analyticsApi.getOTUTByType(start, end, employeeType);
      setCurrentData(res.rows || []);
    } catch (error) {
      console.error('Failed to fetch OT/UT analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee: any) => {
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
            <Select value={employeeType} onValueChange={setEmployeeType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employeeTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
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
                    <span className="font-bold text-primary">{employee.totalOT}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-destructive">{employee.totalUT}</span>
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
                  <p className="text-2xl font-bold text-primary">{selectedEmployee.totalOT} hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Undertime</p>
                  <p className="text-2xl font-bold text-destructive">{selectedEmployee.totalUT} hrs</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Pattern</p>
                  {getTrendBadge(selectedEmployee.trend)}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Additional Insights</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Net hours variance: {(parseFloat(selectedEmployee.totalOT) - parseFloat(selectedEmployee.totalUT)).toFixed(1)} hrs</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
