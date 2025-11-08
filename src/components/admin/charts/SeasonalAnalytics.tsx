import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { useState } from "react";

// Mock data
const mockRainySeasonData = [
  { month: "Jun", absent: 8 },
  { month: "Jul", absent: 12 },
  { month: "Aug", absent: 10 },
  { month: "Sep", absent: 9 },
];

const mockSummerLeavesData = [
  { category: "Faculty", leaves: 25 },
  { category: "Staff", leaves: 8 },
];

const mockHolidaySeasonData = [
  { month: "Nov", absences: 7, earlyOuts: 12 },
  { month: "Dec", absences: 15, earlyOuts: 20 },
];

const mockMonthlyHeatmapData = [
  { month: "Jan", present: 85, late: 10, absent: 3, leave: 2 },
  { month: "Feb", present: 87, late: 8, absent: 3, leave: 2 },
  { month: "Mar", present: 80, late: 12, absent: 5, leave: 3 },
  { month: "Apr", present: 82, late: 11, absent: 4, leave: 3 },
  { month: "May", present: 78, late: 13, absent: 6, leave: 3 },
  { month: "Jun", present: 75, late: 15, absent: 8, leave: 2 },
  { month: "Jul", present: 73, late: 17, absent: 8, leave: 2 },
  { month: "Aug", present: 76, late: 14, absent: 8, leave: 2 },
  { month: "Sep", present: 79, late: 12, absent: 7, leave: 2 },
  { month: "Oct", present: 84, late: 10, absent: 4, leave: 2 },
  { month: "Nov", present: 81, late: 11, absent: 5, leave: 3 },
  { month: "Dec", present: 77, late: 13, absent: 7, leave: 3 },
];

interface SeasonalAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function SeasonalAnalytics({ selectedDate, dateRange }: SeasonalAnalyticsProps) {
  const [heatmapGraphType, setHeatmapGraphType] = useState<"bar" | "stacked">("stacked");

  return (
    <>
      {/* Rainy-Season Absenteeism (Jun-Sep) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Rainy-Season Absenteeism (Jun-Sep)</CardTitle>
          <CardDescription>Confirm weather impact on attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRainySeasonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absences">
                {mockRainySeasonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--destructive))`} opacity={0.6 + (index * 0.1)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summer Leaves (Mar-May) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Summer Leaves (Mar-May)</CardTitle>
          <CardDescription>Quantify faculty leaves vs. staff presence</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockSummerLeavesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leaves" fill="hsl(var(--primary))" name="Leave Requests">
                <Cell fill="hsl(var(--primary))" />
                <Cell fill="hsl(var(--success))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Holiday Season (Nov-Dec) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Holiday Season (Nov-Dec)</CardTitle>
          <CardDescription>See spike in absences/early time-outs</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockHolidaySeasonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="absences" fill="hsl(var(--destructive))" name="Absences" />
              <Bar dataKey="earlyOuts" fill="hsl(var(--warning))" name="Early Time-Outs" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Heatmap of Attendance Status */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Monthly Heatmap of Attendance Status</CardTitle>
              <CardDescription>Visualize fluctuations across the year</CardDescription>
            </div>
            <Select value={heatmapGraphType} onValueChange={(val) => setHeatmapGraphType(val as "bar" | "stacked")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Grouped Bars</SelectItem>
                <SelectItem value="stacked">Stacked Bars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={800}>
            <BarChart data={mockMonthlyHeatmapData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" stackId={heatmapGraphType === "stacked" ? "a" : undefined} fill="hsl(var(--success))" name="Present %" />
              <Bar dataKey="late" stackId={heatmapGraphType === "stacked" ? "a" : undefined} fill="hsl(var(--warning))" name="Late %" />
              <Bar dataKey="absent" stackId={heatmapGraphType === "stacked" ? "a" : undefined} fill="hsl(var(--destructive))" name="Absent %" />
              <Bar dataKey="leave" stackId={heatmapGraphType === "stacked" ? "a" : undefined} fill="hsl(var(--primary))" name="Leave %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
