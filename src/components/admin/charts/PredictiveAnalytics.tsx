import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useState } from "react";

// Mock data for Top Punctual (expanded dataset)
const mockTopPunctualData = [
  { rank: 1, name: "Sofia Martinez", staffId: "23-2025-0050", college: "CCS", onTimeRate: 99.5, avgEarly: "5 mins" },
  { rank: 2, name: "Daniel Torres", staffId: "23-2025-0051", department: "HR", onTimeRate: 99.2, avgEarly: "3 mins" },
  { rank: 3, name: "Carmen Reyes", staffId: "23-2025-0052", college: "CHS", onTimeRate: 98.8, avgEarly: "4 mins" },
  { rank: 4, name: "Roberto Santos", staffId: "23-2025-0053", college: "CED", onTimeRate: 98.5, avgEarly: "2 mins" },
  { rank: 5, name: "Elena Cruz", staffId: "23-2025-0054", department: "Library", onTimeRate: 98.2, avgEarly: "3 mins" },
  { rank: 6, name: "Miguel Fernandez", staffId: "23-2025-0055", college: "CCJ", onTimeRate: 98.0, avgEarly: "2 mins" },
  { rank: 7, name: "Isabel Garcia", staffId: "23-2025-0056", college: "CBPM", onTimeRate: 97.8, avgEarly: "4 mins" },
  { rank: 8, name: "Francisco Dela Cruz", staffId: "23-2025-0057", department: "Clinic", onTimeRate: 97.5, avgEarly: "3 mins" },
  { rank: 9, name: "Luisa Ramos", staffId: "23-2025-0058", college: "CAS", onTimeRate: 97.3, avgEarly: "2 mins" },
  { rank: 10, name: "Antonio Perez", staffId: "23-2025-0059", department: "Security", onTimeRate: 97.0, avgEarly: "1 min" },
  { rank: 11, name: "Patricia Gomez", staffId: "23-2025-0060", college: "GE", onTimeRate: 96.8, avgEarly: "2 mins" },
  { rank: 12, name: "Ricardo Morales", staffId: "23-2025-0061", college: "NSTP", onTimeRate: 96.5, avgEarly: "3 mins" },
  { rank: 13, name: "Beatriz Jimenez", staffId: "23-2025-0062", department: "Canteen", onTimeRate: 96.3, avgEarly: "2 mins" },
  { rank: 14, name: "Diego Ramirez", staffId: "23-2025-0063", college: "CL", onTimeRate: 96.0, avgEarly: "1 min" },
  { rank: 15, name: "Gabriela Lopez", staffId: "23-2025-0064", college: "CCS", onTimeRate: 95.8, avgEarly: "2 mins" },
  { rank: 16, name: "Rodrigo Vargas", staffId: "23-2025-0065", department: "Cleaning Service", onTimeRate: 95.5, avgEarly: "3 mins" },
  { rank: 17, name: "Valentina Ortiz", staffId: "23-2025-0066", college: "CHS", onTimeRate: 95.3, avgEarly: "2 mins" },
  { rank: 18, name: "Emilio Castro", staffId: "23-2025-0067", college: "CED", onTimeRate: 95.0, avgEarly: "1 min" },
  { rank: 19, name: "Camila Herrera", staffId: "23-2025-0068", department: "HR", onTimeRate: 94.8, avgEarly: "2 mins" },
  { rank: 20, name: "Lorenzo Silva", staffId: "23-2025-0069", college: "CCJ", onTimeRate: 94.5, avgEarly: "3 mins" },
];

// Mock data for Top Late (expanded dataset)
const mockTopLateData = [
  { rank: 1, name: "Juan Dela Cruz", staffId: "23-2025-0001", college: "CCS", lateRate: 45.2, avgLate: "35 mins" },
  { rank: 2, name: "Maria Santos", staffId: "23-2025-0005", college: "CHS", lateRate: 42.8, avgLate: "32 mins" },
  { rank: 3, name: "Pedro Reyes", staffId: "23-2025-0012", college: "CCJ", lateRate: 40.5, avgLate: "30 mins" },
  { rank: 4, name: "Ana Garcia", staffId: "23-2025-0018", college: "CED", lateRate: 38.3, avgLate: "28 mins" },
  { rank: 5, name: "Jose Ramos", staffId: "23-2025-0025", college: "CBPM", lateRate: 36.7, avgLate: "27 mins" },
  { rank: 6, name: "Carlos Mendoza", staffId: "23-2025-0101", department: "Security", lateRate: 35.2, avgLate: "40 mins" },
  { rank: 7, name: "Lisa Fernandez", staffId: "23-2025-0105", department: "HR", lateRate: 34.5, avgLate: "35 mins" },
  { rank: 8, name: "Mark Torres", staffId: "23-2025-0110", department: "Library", lateRate: 33.8, avgLate: "32 mins" },
  { rank: 9, name: "Angela Cruz", staffId: "23-2025-0030", college: "CAS", lateRate: 32.5, avgLate: "26 mins" },
  { rank: 10, name: "Ramon Diaz", staffId: "23-2025-0035", college: "GE", lateRate: 31.2, avgLate: "25 mins" },
  { rank: 11, name: "Teresa Flores", staffId: "23-2025-0040", college: "NSTP", lateRate: 30.5, avgLate: "24 mins" },
  { rank: 12, name: "Pablo Navarro", staffId: "23-2025-0115", department: "Clinic", lateRate: 29.8, avgLate: "28 mins" },
  { rank: 13, name: "Claudia Rojas", staffId: "23-2025-0045", college: "CL", lateRate: 28.5, avgLate: "23 mins" },
  { rank: 14, name: "Hector Medina", staffId: "23-2025-0120", department: "Canteen", lateRate: 27.8, avgLate: "26 mins" },
  { rank: 15, name: "Sandra Vega", staffId: "23-2025-0055", college: "CCS", lateRate: 26.5, avgLate: "22 mins" },
  { rank: 16, name: "Alberto Ruiz", staffId: "23-2025-0125", department: "Cleaning Service", lateRate: 25.8, avgLate: "22 mins" },
  { rank: 17, name: "Monica Aguilar", staffId: "23-2025-0060", college: "CHS", lateRate: 24.5, avgLate: "21 mins" },
  { rank: 18, name: "Sergio Campos", staffId: "23-2025-0065", college: "CCJ", lateRate: 23.8, avgLate: "20 mins" },
  { rank: 19, name: "Rosa Nunez", staffId: "23-2025-0130", department: "HR", lateRate: 22.5, avgLate: "19 mins" },
  { rank: 20, name: "Jorge Paredes", staffId: "23-2025-0070", college: "CED", lateRate: 21.2, avgLate: "18 mins" },
];

// Mock data for Future Absences Forecast
const mockForecastData = [
  { name: "Rafael Aquino", department: "CCS", absenceProbability: 15, lateProbability: 25, trend: "improving" },
  { name: "Ivy Perez", department: "CHS", absenceProbability: 30, lateProbability: 40, trend: "declining" },
  { name: "Cedrick Plupenio", department: "HR", absenceProbability: 10, lateProbability: 20, trend: "stable" },
  { name: "Maria Santos", department: "CCJ", absenceProbability: 35, lateProbability: 45, trend: "declining" },
  { name: "John Dela Cruz", department: "COE", absenceProbability: 20, lateProbability: 30, trend: "stable" },
];

// Mock data for High-Risk Employees
const mockHighRiskData = [
  { name: "Ivy Perez", department: "CHS", riskScore: 85, patterns: "Frequent absences on Mondays, Late 3+ times/week", recommendation: "Schedule meeting to discuss attendance" },
  { name: "Maria Santos", department: "CCJ", riskScore: 78, patterns: "Consistent tardiness, Increased absences last month", recommendation: "Review workload and personal circumstances" },
  { name: "Juan Reyes", department: "Library", riskScore: 72, patterns: "Early time-outs, Declining punctuality", recommendation: "Provide flexible schedule options" },
  { name: "Anna Garcia", department: "CBA", riskScore: 68, patterns: "Weather-related absences, Late during rainy season", recommendation: "Consider work-from-home policy" },
];

interface PredictiveAnalyticsProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function PredictiveAnalytics({ selectedDate, dateRange }: PredictiveAnalyticsProps) {
  const [topViewType, setTopViewType] = useState<"punctual" | "late">("late");
  const [topCount, setTopCount] = useState<number>(10);

  const getTopData = () => {
    const data = topViewType === "punctual" ? mockTopPunctualData : mockTopLateData;
    return data.slice(0, topCount);
  };

  return (
    <>
      {/* Top Punctual / Top Late Employees */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Top {topViewType === "punctual" ? "Punctual" : "Late"} Employees</CardTitle>
              <CardDescription>
                {topViewType === "punctual" ? "Recognize best performers" : "Identify chronic latecomers"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={topViewType} onValueChange={(val) => setTopViewType(val as "punctual" | "late")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="punctual">Most Punctual</SelectItem>
                  <SelectItem value="late">Most Late</SelectItem>
                </SelectContent>
              </Select>
              <Select value={topCount.toString()} onValueChange={(val) => setTopCount(Number(val))}>
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
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>College/Dept</TableHead>
                <TableHead>{topViewType === "punctual" ? "On-Time Rate" : "Late Rate"}</TableHead>
                <TableHead>{topViewType === "punctual" ? "Avg Early" : "Avg Late"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getTopData().map((employee) => (
                <TableRow key={employee.staffId}>
                  <TableCell className="font-bold">
                    <Badge variant={employee.rank <= 3 ? "default" : "secondary"}>
                      #{employee.rank}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{employee.staffId}</TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{"college" in employee ? employee.college : employee.department}</TableCell>
                  <TableCell>
                    <span className={topViewType === "punctual" ? "text-success font-bold" : "text-destructive font-bold"}>
                      {topViewType === "punctual" ? `${employee.onTimeRate}%` : `${employee.lateRate}%`}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {topViewType === "punctual" ? employee.avgEarly : employee.avgLate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Forecast Future Absences / Lates */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Forecast Future Absences / Lates
          </CardTitle>
          <CardDescription>Use past data to predict who may be absent or late next month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Absence Probability</TableHead>
                <TableHead>Late Probability</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockForecastData.map((person) => (
                <TableRow key={person.name}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.department}</TableCell>
                  <TableCell>
                    <Badge variant={person.absenceProbability > 25 ? "destructive" : "secondary"}>
                      {person.absenceProbability}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.lateProbability > 35 ? "destructive" : "secondary"}>
                      {person.lateProbability}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        person.trend === "improving" ? "default" : 
                        person.trend === "declining" ? "destructive" : 
                        "secondary"
                      }
                    >
                      {person.trend}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Identify High-Risk Employees */}
      <Card className="shadow-md border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Identify High-Risk Employees
          </CardTitle>
          <CardDescription>Staff likely to be late/absent based on patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHighRiskData.map((person) => (
              <div key={person.name} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{person.name}</h4>
                    <p className="text-sm text-muted-foreground">{person.department}</p>
                  </div>
                  <Badge variant="destructive" className="text-lg px-3 py-1">
                    Risk: {person.riskScore}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Patterns:</span> {person.patterns}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Recommendation:</span> {person.recommendation}
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
