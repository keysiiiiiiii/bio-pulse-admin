import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  const data = viewType === "faculty" ? mockFacultyData : mockStaffData;
  
  const getDataKeys = () => {
    if (viewType === "faculty") {
      return ["CCS", "CHS", "CCJ", "CED", "NSTP", "GE", "CBPM", "CL", "CAS"];
    }
    return ["HR", "Clinic", "Security", "Library", "Canteen", "Cleaning"];
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Tardiness Trends</CardTitle>
            <CardDescription>Weekly tardiness patterns by {viewType === "faculty" ? "college" : "department"}</CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            {getDataKeys().map((key, index) => (
              <Bar key={key} dataKey={key} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
