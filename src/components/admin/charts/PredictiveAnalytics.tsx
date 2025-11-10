import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { analyticsApi } from "@/services/api/analyticsApi";
import { format } from "date-fns";

interface PredictiveAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function PredictiveAnalytics({ selectedDate, dateRange }: PredictiveAnalyticsProps) {
  const [topViewType, setTopViewType] = useState<"punctual" | "late">("late");
  const [topCount, setTopCount] = useState<number>(10);
  const [topData, setTopData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, dateRange, topViewType, topCount]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 
                    selectedDate ? format(new Date(selectedDate.getFullYear(), 0, 1), 'yyyy-MM-dd') : 
                    format(new Date(2025, 0, 1), 'yyyy-MM-dd');
      const end = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 
                  selectedDate ? format(new Date(selectedDate.getFullYear(), 11, 31), 'yyyy-MM-dd') : 
                  format(new Date(2025, 11, 31), 'yyyy-MM-dd');

      const res = await analyticsApi.getTopPunctualLate(start, end, topViewType, topCount);
      setTopData(res.rows || []);
    } catch (error) {
      console.error('Failed to fetch predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Top Punctual / Top Late */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                Top {topViewType === "punctual" ? "Punctual" : "Late"} Employees
              </CardTitle>
              <CardDescription>
                {topViewType === "punctual"
                  ? "Recognize best performers"
                  : "Identify chronic latecomers"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={topViewType}
                onValueChange={(val) => setTopViewType(val as "punctual" | "late")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="punctual">Most Punctual</SelectItem>
                  <SelectItem value="late">Most Late</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={topCount.toString()}
                onValueChange={(val) => setTopCount(Number(val))}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>College/Dept</TableHead>
                <TableHead>
                  {topViewType === "punctual" ? "On-Time Rate" : "Late Rate"}
                </TableHead>
                <TableHead>
                  {topViewType === "punctual" ? "Avg Early" : "Avg Late"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topData.map((employee) => (
                <TableRow key={employee.staffId}>
                  <TableCell>
                    <Badge variant={employee.rank <= 3 ? "default" : "secondary"}>
                      #{employee.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{employee.staffId}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.college || employee.department}</TableCell>
                  <TableCell>
                    <span
                      className={
                        topViewType === "punctual"
                          ? "text-green-600 font-bold"
                          : "text-red-600 font-bold"
                      }
                    >
                      {topViewType === "punctual"
                        ? `${employee.onTimeRate}%`
                        : `${employee.lateRate}%`}
                    </span>
                  </TableCell>
                  <TableCell>
                    {topViewType === "punctual"
                      ? employee.avgEarly
                      : employee.avgLate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* High-Risk Employees Placeholder */}
      <Card className="shadow-md border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            High-Risk Employee Identification
          </CardTitle>
          <CardDescription>
            Advanced pattern recognition for attendance risk prediction coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature will use machine learning to identify employees with declining attendance patterns
            and predict future attendance issues based on historical data.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
