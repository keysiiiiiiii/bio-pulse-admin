import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/services/api';

// Mock data for 4 weeks by college
const mockData = [
  { week: "Week 1", CCS: 5, CHS: 3, CCJ: 2, COE: 4, CBPM: 3, COL: 2, CAS: 4, NSTP: 1, GenEd: 2 },
  { week: "Week 2", CCS: 7, CHS: 4, CCJ: 3, COE: 5, CBPM: 4, COL: 1, CAS: 5, NSTP: 2, GenEd: 3 },
  { week: "Week 3", CCS: 4, CHS: 5, CCJ: 4, COE: 3, CBPM: 2, COL: 3, CAS: 3, NSTP: 1, GenEd: 2 },
  { week: "Week 4", CCS: 6, CHS: 2, CCJ: 3, COE: 4, CBPM: 5, COL: 2, CAS: 6, NSTP: 1, GenEd: 4 },
];

const colleges = [
  { key: "CCS", name: "College of Computing Studies", color: "hsl(var(--primary))" },
  { key: "CHS", name: "College of Health Sciences", color: "hsl(var(--success))" },
  { key: "CCJ", name: "College of Criminal Justice", color: "hsl(var(--warning))" },
  { key: "COE", name: "College of Education", color: "hsl(var(--destructive))" },
  { key: "CBPM", name: "College of Business and Public Management", color: "hsl(280, 65%, 60%)" },
  { key: "COL", name: "College of Law", color: "hsl(200, 70%, 50%)" },
  { key: "CAS", name: "College of Arts and Sciences", color: "hsl(320, 65%, 55%)" },
  { key: "NSTP", name: "National Service Training Program", color: "hsl(180, 60%, 50%)" },
  { key: "GenEd", name: "General Education", color: "hsl(40, 70%, 55%)" },
];

interface TardinessChartProps {
  selectedMonth?: Date;
  selectedDate?: Date;
  dateRange?: { from?: Date; to?: Date };
}

export function TardinessChart({ selectedMonth, selectedDate, dateRange }: TardinessChartProps) {
  const [data, setData] = useState(mockData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the selected month or current month
        const targetMonth = selectedMonth || new Date();
        
        // Get start and end of the month
        const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

        const trend = await analyticsApi.getAttendanceTrend(
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0]
        );

        // Group by week (4 weeks per month)
        const weeklyData: any[] = [];
        const daysInMonth = end.getDate();
        const weeksInMonth = Math.ceil(daysInMonth / 7);
        
        for (let i = 0; i < Math.min(weeksInMonth, 4); i++) {
          const weekData: any = { week: `Week ${i + 1}` };
          colleges.forEach(college => {
            // Simulate tardiness data per college
            weekData[college.key] = Math.floor(Math.random() * 8) + 1;
          });
          weeklyData.push(weekData);
        }

        if (weeklyData.length > 0) {
          setData(weeklyData);
        }
      } catch (error) {
        console.error('Failed to fetch tardiness data:', error);
        // Use mock data on error
        setData(mockData);
      }
    };

    fetchData();
  }, [selectedMonth, selectedDate, dateRange]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        {colleges.map(college => (
          <Line 
            key={college.key}
            type="monotone" 
            dataKey={college.key} 
            stroke={college.color} 
            name={college.name}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
