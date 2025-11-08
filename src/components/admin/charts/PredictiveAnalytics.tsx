import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";

// ========== MOCK DATA (Existing + New) ==========

// Top Punctual and Late employees (same as before)
const mockTopPunctualData = [
  { rank: 1, name: "Sofia Martinez", staffId: "23-2025-0050", college: "CCS", onTimeRate: 99.5, avgEarly: "5 mins" },
  { rank: 2, name: "Daniel Torres", staffId: "23-2025-0051", department: "HR", onTimeRate: 99.2, avgEarly: "3 mins" },
  { rank: 3, name: "Carmen Reyes", staffId: "23-2025-0052", college: "CHS", onTimeRate: 98.8, avgEarly: "4 mins" },
  { rank: 4, name: "Roberto Santos", staffId: "23-2025-0053", college: "CED", onTimeRate: 98.5, avgEarly: "2 mins" },
  { rank: 5, name: "Elena Cruz", staffId: "23-2025-0054", department: "Library", onTimeRate: 98.2, avgEarly: "3 mins" },
];
const mockTopLateData = [
  { rank: 1, name: "Juan Dela Cruz", staffId: "23-2025-0001", college: "CCS", lateRate: 45.2, avgLate: "35 mins" },
  { rank: 2, name: "Maria Santos", staffId: "23-2025-0005", college: "CHS", lateRate: 42.8, avgLate: "32 mins" },
  { rank: 3, name: "Pedro Reyes", staffId: "23-2025-0012", college: "CCJ", lateRate: 40.5, avgLate: "30 mins" },
  { rank: 4, name: "Ana Garcia", staffId: "23-2025-0018", college: "CED", lateRate: 38.3, avgLate: "28 mins" },
  { rank: 5, name: "Jose Ramos", staffId: "23-2025-0025", college: "CBPM", lateRate: 36.7, avgLate: "27 mins" },
];

// Future Absence Prediction
const mockForecastData = [
  { name: "Rafael Aquino", department: "CCS", absenceProbability: 15, lateProbability: 25, trend: "improving" },
  { name: "Ivy Perez", department: "CHS", absenceProbability: 30, lateProbability: 40, trend: "declining" },
  { name: "Cedrick Plupenio", department: "HR", absenceProbability: 10, lateProbability: 20, trend: "stable" },
  { name: "Maria Santos", department: "CCJ", absenceProbability: 35, lateProbability: 45, trend: "declining" },
  { name: "John Dela Cruz", department: "COE", absenceProbability: 20, lateProbability: 30, trend: "stable" },
];

// High Risk
const mockHighRiskData = [
  { name: "Ivy Perez", department: "CHS", riskScore: 85, patterns: "Frequent absences on Mondays, Late 3+ times/week", recommendation: "Schedule meeting to discuss attendance" },
  { name: "Maria Santos", department: "CCJ", riskScore: 78, patterns: "Consistent tardiness, Increased absences last month", recommendation: "Review workload and personal circumstances" },
  { name: "Juan Reyes", department: "Library", riskScore: 72, patterns: "Early time-outs, Declining punctuality", recommendation: "Provide flexible schedule options" },
  { name: "Anna Garcia", department: "CBA", riskScore: 68, patterns: "Weather-related absences, Late during rainy season", recommendation: "Consider work-from-home policy" },
];

// NEW: Mock trend dataset (Absence/Late Trends)
const mockUserTrendData = [
  { week: "Week 1", date: "Nov 1", "Juan Dela Cruz": 5, "Maria Santos": 4, "Ana Garcia": 3, "Pedro Reyes": 6, "Ivy Perez": 2, "Cedrick Plupenio": 1 },
  { week: "Week 2", date: "Nov 8", "Juan Dela Cruz": 4, "Maria Santos": 5, "Ana Garcia": 4, "Pedro Reyes": 5, "Ivy Perez": 3, "Cedrick Plupenio": 1 },
  { week: "Week 3", date: "Nov 15", "Juan Dela Cruz": 6, "Maria Santos": 3, "Ana Garcia": 5, "Pedro Reyes": 4, "Ivy Perez": 2, "Cedrick Plupenio": 0 },
  { week: "Week 4", date: "Nov 22", "Juan Dela Cruz": 3, "Maria Santos": 2, "Ana Garcia": 4, "Pedro Reyes": 3, "Ivy Perez": 1, "Cedrick Plupenio": 0 },
];

// Filters
const colleges = ["All Colleges", "CCS", "CHS", "CCJ", "CED", "CBPM"];
const departments = ["All Departments", "HR", "Library", "Security", "Canteen"];

// Color Palette for Charts
const COLOR_PALETTE = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
  "#2E93fA",
  "#00E396",
  "#775DD0",
  "#FEB019",
];

interface PredictiveAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function PredictiveAnalytics({ selectedDate, dateRange }: PredictiveAnalyticsProps) {
  const [topViewType, setTopViewType] = useState<"punctual" | "late">("late");
  const [topCount, setTopCount] = useState<number>(10);

  // New states for Trend visualization
  const [trendViewType, setTrendViewType] = useState<"chart" | "table">("chart");
  const [selectedCollege, setSelectedCollege] = useState<string>("All Colleges");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All Departments");
  const [searchName, setSearchName] = useState<string>("");

  // Filter logic for Trend Data
  const getFilteredNames = () => {
    // Merge all users with metadata
    const allUsers = [
      ...mockTopLateData.map((u) => ({ name: u.name, college: u.college, department: 'department' in u ? u.department : null })),
      ...mockTopPunctualData.map((u) => ({ name: u.name, college: u.college, department: 'department' in u ? u.department : null })),
    ];

    return allUsers
      .filter((u) => {
        const matchesCollege = selectedCollege === "All Colleges" || u.college === selectedCollege;
        const matchesDept = selectedDepartment === "All Departments" || (u.department && u.department === selectedDepartment);
        const matchesSearch = u.name.toLowerCase().includes(searchName.toLowerCase());
        return matchesCollege && matchesDept && matchesSearch;
      })
      .map((u) => u.name);
  };

  const filteredNames = getFilteredNames();

  const getTopData = () => {
    const data = topViewType === "punctual" ? mockTopPunctualData : mockTopLateData;
    return data.slice(0, topCount);
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
              {getTopData().map((employee) => (
                <TableRow key={employee.staffId}>
                  <TableCell>
                    <Badge variant={employee.rank <= 3 ? "default" : "secondary"}>
                      #{employee.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{employee.staffId}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>
                    {"college" in employee ? employee.college : employee.department}
                  </TableCell>
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

      {/* Absence / Late Trend Visualization */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Absence / Late Trend Visualization
              </CardTitle>
              <CardDescription>
                Visualize attendance behavior trends over time
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Select
                value={trendViewType}
                onValueChange={(val) => setTrendViewType(val as "chart" | "table")}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chart">Line Chart</SelectItem>
                  <SelectItem value="table">Table View</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedCollege}
                onValueChange={(val) => setSelectedCollege(val)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDepartment}
                onValueChange={(val) => setSelectedDepartment(val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Search name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {trendViewType === "chart" ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={mockUserTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                {filteredNames.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Date</TableHead>
                  {filteredNames.map((name) => (
                    <TableHead key={name}>{name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUserTrendData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.week}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    {filteredNames.map((name) => (
                      <TableCell key={name}>{row[name] ?? "-"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* High-Risk Employees */}
      <Card className="shadow-md border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Identify High-Risk Employees
          </CardTitle>
          <CardDescription>
            Staff likely to be late/absent based on patterns
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {mockHighRiskData.map((person) => (
              <div key={person.name} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{person.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {person.department}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-lg px-3 py-1">
                    Risk: {person.riskScore}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Patterns:</span>{" "}
                    {person.patterns}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Recommendation:</span>{" "}
                    {person.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
