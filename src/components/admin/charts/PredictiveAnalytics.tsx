import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";

// Mock data
const mockForecastData = [
  { name: "Rafael Aquino", department: "CCS", absenceProbability: 15, lateProbability: 25, trend: "improving" },
  { name: "Ivy Perez", department: "CHS", absenceProbability: 30, lateProbability: 40, trend: "declining" },
  { name: "Cedrick Plupenio", department: "HR", absenceProbability: 10, lateProbability: 20, trend: "stable" },
  { name: "Maria Santos", department: "CCJ", absenceProbability: 35, lateProbability: 45, trend: "declining" },
  { name: "John Dela Cruz", department: "COE", absenceProbability: 20, lateProbability: 30, trend: "stable" },
];

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
  return (
    <>
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
