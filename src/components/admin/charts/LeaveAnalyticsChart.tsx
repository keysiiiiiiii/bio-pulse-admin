import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { analyticsApi } from "@/services/api";

export function LeaveAnalyticsChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get leave summary for the past 6 months
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        
        const summary = await analyticsApi.getLeaveSummary(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        
        // Transform data by month
        const monthlyData: Record<string, any> = {};
        
        summary.forEach((item) => {
          // Aggregate by month if you have date information
          // For now, using a simple aggregation
          const breakdown = item.status_breakdown || {};
          
          Object.entries(breakdown).forEach(([leaveType, count]) => {
            const month = new Date().toLocaleString('default', { month: 'short' });
            if (!monthlyData[month]) {
              monthlyData[month] = { month, vacation: 0, sick: 0, emergency: 0 };
            }
            
            if (leaveType.toLowerCase().includes('vacation')) {
              monthlyData[month].vacation += count as number;
            } else if (leaveType.toLowerCase().includes('sick')) {
              monthlyData[month].sick += count as number;
            } else if (leaveType.toLowerCase().includes('emergency')) {
              monthlyData[month].emergency += count as number;
            }
          });
        });
        
        setData(Object.values(monthlyData));
      } catch (error) {
        console.error('Failed to fetch leave analytics:', error);
        // Set fallback data
        setData([
          { month: "Jan", vacation: 0, sick: 0, emergency: 0 },
          { month: "Feb", vacation: 0, sick: 0, emergency: 0 },
          { month: "Mar", vacation: 0, sick: 0, emergency: 0 },
          { month: "Apr", vacation: 0, sick: 0, emergency: 0 },
          { month: "May", vacation: 0, sick: 0, emergency: 0 },
          { month: "Jun", vacation: 0, sick: 0, emergency: 0 },
        ]);
      }
    };

    fetchData();
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="vacation" fill="hsl(var(--primary))" name="Vacation Leave" />
        <Bar dataKey="sick" fill="hsl(var(--secondary))" name="Sick Leave" />
        <Bar dataKey="emergency" fill="hsl(var(--accent))" name="Emergency Leave" />
      </BarChart>
    </ResponsiveContainer>
  );
}
