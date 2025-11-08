import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { analyticsApi } from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";

// Mock data structure with all 13 leave types
const mockData = [
  { month: "Jan", vacation: 5, forced: 2, sick: 3, maternity: 1, paternity: 0, spl: 1, solo: 0, study: 0, vawc: 0, rehab: 0, women: 1, emergency: 1, adoption: 0 },
  { month: "Feb", vacation: 7, forced: 1, sick: 2, maternity: 0, paternity: 1, spl: 2, solo: 0, study: 0, vawc: 0, rehab: 0, women: 0, emergency: 2, adoption: 0 },
  { month: "Mar", vacation: 10, forced: 3, sick: 4, maternity: 2, paternity: 1, spl: 1, solo: 1, study: 0, vawc: 0, rehab: 0, women: 1, emergency: 1, adoption: 0 },
  { month: "Apr", vacation: 8, forced: 2, sick: 5, maternity: 1, paternity: 0, spl: 2, solo: 0, study: 1, vawc: 1, rehab: 0, women: 0, emergency: 3, adoption: 0 },
  { month: "May", vacation: 6, forced: 1, sick: 3, maternity: 0, paternity: 1, spl: 1, solo: 0, study: 0, vawc: 0, rehab: 0, women: 1, emergency: 2, adoption: 1 },
  { month: "Jun", vacation: 9, forced: 2, sick: 6, maternity: 1, paternity: 0, spl: 2, solo: 1, study: 0, vawc: 0, rehab: 0, women: 0, emergency: 1, adoption: 0 },
  { month: "Jul", vacation: 7, forced: 1, sick: 4, maternity: 2, paternity: 1, spl: 1, solo: 0, study: 0, vawc: 1, rehab: 0, women: 1, emergency: 2, adoption: 0 },
  { month: "Aug", vacation: 8, forced: 2, sick: 5, maternity: 0, paternity: 0, spl: 2, solo: 0, study: 1, vawc: 0, rehab: 1, women: 0, emergency: 1, adoption: 0 },
  { month: "Sep", vacation: 10, forced: 3, sick: 3, maternity: 1, paternity: 1, spl: 1, solo: 1, study: 0, vawc: 0, rehab: 0, women: 1, emergency: 3, adoption: 0 },
  { month: "Oct", vacation: 6, forced: 1, sick: 4, maternity: 0, paternity: 0, spl: 2, solo: 0, study: 0, vawc: 1, rehab: 0, women: 0, emergency: 2, adoption: 1 },
  { month: "Nov", vacation: 9, forced: 2, sick: 6, maternity: 1, paternity: 1, spl: 1, solo: 0, study: 1, vawc: 0, rehab: 0, women: 1, emergency: 1, adoption: 0 },
  { month: "Dec", vacation: 11, forced: 4, sick: 2, maternity: 0, paternity: 0, spl: 3, solo: 1, study: 0, vawc: 0, rehab: 0, women: 0, emergency: 2, adoption: 0 },
];

const leaveTypes = [
  { key: "vacation", label: "Vacation Leave", color: "hsl(var(--primary))" },
  { key: "forced", label: "Mandatory/Forced Leave", color: "hsl(220, 70%, 50%)" },
  { key: "sick", label: "Sick Leave", color: "hsl(var(--destructive))" },
  { key: "maternity", label: "Maternity Leave", color: "hsl(280, 65%, 60%)" },
  { key: "paternity", label: "Paternity Leave", color: "hsl(200, 70%, 50%)" },
  { key: "spl", label: "Special Privilege Leave", color: "hsl(var(--success))" },
  { key: "solo", label: "Solo Parent Leave", color: "hsl(320, 65%, 55%)" },
  { key: "study", label: "Study Leave", color: "hsl(180, 60%, 50%)" },
  { key: "vawc", label: "10-Day VAWC Leave", color: "hsl(340, 75%, 55%)" },
  { key: "rehab", label: "Rehabilitation Privilege", color: "hsl(40, 70%, 55%)" },
  { key: "women", label: "Special Leave Benefits for Women", color: "hsl(300, 70%, 60%)" },
  { key: "emergency", label: "Special Emergency (Calamity) Leave", color: "hsl(var(--warning))" },
  { key: "adoption", label: "Adoption Leave", color: "hsl(260, 65%, 60%)" },
];

interface LeaveAnalyticsChartProps {
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function LeaveAnalyticsChart({ selectedDate, dateRange }: LeaveAnalyticsChartProps) {
  const [chartData, setChartData] = useState<any[]>(mockData);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>(
    leaveTypes.map(lt => lt.key)
  );

  const toggleLeaveType = (key: string) => {
    setSelectedLeaveTypes(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get date range for last 6 months or based on selected date
        const end = selectedDate || new Date();
        const start = new Date(end);
        start.setMonth(start.getMonth() - 6);

        const leaveSummary = await analyticsApi.getLeaveSummary(
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0]
        );

        // Transform data by month and leave type
        const monthlyData: Record<string, any> = {};
        
        leaveSummary.forEach(item => {
          // Aggregate by month
          const statuses = item.status_breakdown;
          Object.entries(statuses).forEach(([status, count]) => {
            const month = new Date().toLocaleString('default', { month: 'short' });
            if (!monthlyData[month]) {
              monthlyData[month] = { month };
              leaveTypes.forEach(lt => monthlyData[month][lt.key] = 0);
            }
            
            // Map status to leave type keys
            const lowerStatus = status.toLowerCase();
            leaveTypes.forEach(lt => {
              if (lowerStatus.includes(lt.key) || lowerStatus.includes(lt.label.toLowerCase())) {
                monthlyData[month][lt.key] += count;
              }
            });
          });
        });

        const transformedData = Object.values(monthlyData);
        if (transformedData.length > 0) {
          setChartData(transformedData);
        }
      } catch (error) {
        console.error('Failed to fetch leave analytics:', error);
        // Use mock data on error
        setChartData(mockData);
      }
    };

    fetchData();
  }, [selectedDate, dateRange]);

  return (
    <div className="space-y-4">
      {/* Leave Type Filters */}
      <div className="flex flex-wrap gap-3 pb-4 border-b">
        {leaveTypes.map((type) => (
          <div key={type.key} className="flex items-center gap-2">
            <Checkbox 
              id={type.key} 
              checked={selectedLeaveTypes.includes(type.key)}
              onCheckedChange={() => toggleLeaveType(type.key)}
            />
            <label htmlFor={type.key} className="text-sm cursor-pointer">
              {type.label}
            </label>
          </div>
        ))}
      </div>

      {/* Scrollable Chart */}
      <div className="overflow-x-auto">
        <ResponsiveContainer width="100%" height={300} minWidth={1000}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {leaveTypes
              .filter(type => selectedLeaveTypes.includes(type.key))
              .map(type => (
                <Bar 
                  key={type.key}
                  dataKey={type.key} 
                  fill={type.color} 
                  name={type.label} 
                />
              ))
            }
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
