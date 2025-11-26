import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { attendanceApi } from "@/services/api";
import { format } from "date-fns";

interface AttendanceChartProps {
  selectedDate?: Date;
}

export function AttendanceChart({ selectedDate }: AttendanceChartProps) {
  const [data, setData] = useState([
    { name: "Present", value: 0, color: "#22c55e" },
    { name: "Absent", value: 0, color: "#ef4444" },
    { name: "Tardy", value: 0, color: "#f97316" },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastFetchDate, setLastFetchDate] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const date = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      
      // Only fetch if the date has changed
      if (date === lastFetchDate) {
        return;
      }
      
      setLoading(true);
      setLastFetchDate(date);
      
      try {
        console.log('AttendanceChart: Fetching stats for date:', date);
        
        const stats = await attendanceApi.getStats(date);
        console.log('AttendanceChart: Received stats:', stats);
        
        // Calculate total absent including leave
        const totalAbsent = (stats.absent || 0) + (stats.on_leave || 0);
        
        // Create new data array to force re-render
        const newData = [
          { name: "Present", value: stats.present || 0, color: "#22c55e" },
          { name: "Absent", value: totalAbsent, color: "#ef4444" },
          { name: "Tardy", value: stats.late || 0, color: "#f97316" },
        ];
        
        console.log('AttendanceChart: Setting chart data:', newData);
        setData(newData);
      } catch (error) {
        console.error('AttendanceChart: Failed to fetch stats:', error);
        // Reset to zeros on error
        setData([
          { name: "Present", value: 0, color: "#22c55e" },
          { name: "Absent", value: 0, color: "#ef4444" },
          { name: "Tardy", value: 0, color: "#f97316" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]); // Re-run when selectedDate changes

  // Filter out zero values for cleaner chart
  const chartData = data.filter(item => item.value > 0);
  const hasData = chartData.length > 0;
  const totalAttendance = data.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          Loading chart data...
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg">No attendance data for this date</p>
          <p className="text-sm mt-2">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'today'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <p className="text-2xl font-bold text-success">{data[0].value}</p>
          <p className="text-sm text-muted-foreground">Present</p>
          <p className="text-xs text-green-600 font-medium">
            {totalAttendance > 0 ? ((data[0].value / totalAttendance) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-destructive">{data[1].value}</p>
          <p className="text-sm text-muted-foreground">Absent</p>
          <p className="text-xs text-red-600 font-medium">
            {totalAttendance > 0 ? ((data[1].value / totalAttendance) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-warning">{data[2].value}</p>
          <p className="text-sm text-muted-foreground">Tardy</p>
          <p className="text-xs text-orange-600 font-medium">
            {totalAttendance > 0 ? ((data[2].value / totalAttendance) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: any) => [value, name]}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}