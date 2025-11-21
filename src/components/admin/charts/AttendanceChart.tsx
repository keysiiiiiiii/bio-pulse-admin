import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { attendanceApi } from "@/services/api";

interface AttendanceChartProps {
  selectedDate?: Date;
}

export function AttendanceChart({ selectedDate }: AttendanceChartProps) {
  const [data, setData] = useState([
    { name: "Present", value: 0, color: "hsl(var(--success))" },
    { name: "Absent", value: 0, color: "hsl(var(--destructive))" },
    { name: "Tardy", value: 0, color: "hsl(var(--warning))" },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const date = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const stats = await attendanceApi.getStats(date);
        
        // Present includes both on-time and late arrivals
        // Calculate on-time by subtracting late from present
        const onTime = stats.present - stats.late;
        
        setData([
          { name: "On Time", value: onTime, color: "hsl(var(--success))" },
          { name: "Late", value: stats.late, color: "hsl(var(--warning))" },
          { name: "Absent", value: stats.absent, color: "hsl(var(--destructive))" },
        ]);
      } catch (error) {
        console.error('Failed to fetch attendance stats:', error);
      }
    };

    fetchData();
  }, [selectedDate]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
