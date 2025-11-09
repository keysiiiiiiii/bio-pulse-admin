import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useState } from "react";

// Mock data for Faculty (Colleges)
const mockFacultyData = [
  { week: "Week 1", CCS: 12, CHS: 8, CCJ: 5, CED: 7, NSTP: 3, GE: 6, CBPM: 9, CL: 4, CAS: 10 },
  { week: "Week 2", CCS: 15, CHS: 10, CCJ: 7, CED: 9, NSTP: 5, GE: 8, CBPM: 11, CL: 6, CAS: 12 },
  { week: "Week 3", CCS: 10, CHS: 7, CCJ: 4, CED: 6, NSTP: 2, GE: 5, CBPM: 8, CL: 3, CAS: 9 },
  { week: "Week 4", CCS: 13, CHS: 9, CCJ: 6, CED: 8, NSTP: 4, GE: 7, CBPM: 10, CL: 5, CAS: 11 },
];

// Mock data for Staff (Departments)
const mockStaffData = [
  { week: "Week 1", HR: 5, Clinic: 3, Security: 8, Library: 4, Canteen: 6, Cleaning: 7 },
  { week: "Week 2", HR: 7, Clinic: 4, Security: 10, Library: 5, Canteen: 8, Cleaning: 9 },
  { week: "Week 3", HR: 4, Clinic: 2, Security: 6, Library: 3, Canteen: 5, Cleaning: 6 },
  { week: "Week 4", HR: 6, Clinic: 3, Security: 9, Library: 4, Canteen: 7, Cleaning: 8 },
];

interface TardinessChartProps {
  selectedDate?: Date;
}

export function TardinessChart({ selectedDate }: TardinessChartProps) {
  const [viewType, setViewType] = useState<"faculty" | "staff">("faculty");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const data = viewType === "faculty" ? mockFacultyData : mockStaffData;

  // 🎨 Hardcoded color palette (rotates automatically)
  const colors = [
    "#2563eb", // blue
    "#16a34a", // green
    "#f59e0b", // amber
    "#dc2626", // red
    "#9333ea", // violet
    "#0ea5e9", // sky
    "#f43f5e", // rose
    "#84cc16", // lime
    "#e11d48", // pink-red
  ];

  const getDataKeys = () => {
    if (viewType === "faculty") {
      return ["CCS", "CHS", "CCJ", "CED", "NSTP", "Gen Ed", "CBPM", "CL", "CAS"];
    }
    return ["HR", "Clinic", "Security", "Library", "Canteen", "Cleaning Services", "Registrar"];
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Tardiness Trends</CardTitle>
            <CardDescription>
              Weekly tardiness patterns by {viewType === "faculty" ? "college" : "department"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 👇 Chart Type Toggle */}
            <Select value={chartType} onValueChange={(val) => setChartType(val as "bar" | "line")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>

            {/* 👇 Faculty/Staff Toggle */}
            <Select value={viewType} onValueChange={(val) => setViewType(val as "faculty" | "staff")}>
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

      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          {/* ✅ Conditional Rendering Based on Chart Type */}
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              {getDataKeys().map((key, index) => (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              {getDataKeys().map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
