import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';

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
  selectedMonth: Date;
}

export function LeaveAnalyticsChart({ selectedMonth }: LeaveAnalyticsChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>(leaveTypes.map(lt => lt.key));
  const [loading, setLoading] = useState(false);

  const toggleLeaveType = (key: string) => {
    setSelectedLeaveTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const unselectAll = () => setSelectedLeaveTypes([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        const monthStart = format(firstDay, 'yyyy-MM-dd');
        const monthEnd = format(lastDay, 'yyyy-MM-dd');
        
        console.log('Fetching leave data between:', monthStart, 'and', monthEnd);
        
        // ✅ FIXED: Query with proper leave filtering
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('leave_type, week_of_year, att_date, on_leave')
          .gte('att_date', monthStart)
          .lte('att_date', monthEnd)
          .or('on_leave.eq.1,on_leave.eq.true') // ✅ Handle both boolean and integer
          .not('leave_type', 'is', null);
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Fetched leave data:', data);
        
        if (!data || data.length === 0) {
          console.log('No leave data found');
          setChartData([]);
          return;
        }
        
        // ✅ FIXED: Generate all weeks in the month (1-5 typically)
        const firstWeek = Math.ceil((firstDay.getDate() - firstDay.getDay()) / 7) + 1;
        const lastWeek = Math.ceil((lastDay.getDate() - lastDay.getDay()) / 7) + 1;
        const weeksInMonth = [];
        for (let w = firstWeek; w <= lastWeek; w++) {
          weeksInMonth.push(w);
        }
        
        console.log('Weeks in month:', weeksInMonth);
        
        // Transform data by week
        const transformedData = weeksInMonth.map(week => {
          const weekData: any = { month: `Week ${week}` };
          
          leaveTypes.forEach(lt => {
            const count = data.filter(d => {
              const leaveTypeMatch = d.leave_type?.toLowerCase().includes(lt.key.toLowerCase());
              return d.week_of_year === week && leaveTypeMatch;
            }).length;
            
            weekData[lt.key] = count;
          });
          
          return weekData;
        });
        
        console.log('Transformed leave data:', transformedData);
        setChartData(transformedData);
      } catch (error) {
        console.error('Error fetching leave data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedMonth]);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">Select leave types to display</p>
          <Button variant="ghost" size="sm" onClick={unselectAll}>Unselect All</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {leaveTypes.map((leaveType) => (
            <div key={leaveType.key} className="flex items-center space-x-2">
              <Checkbox 
                id={leaveType.key} 
                checked={selectedLeaveTypes.includes(leaveType.key)} 
                onCheckedChange={() => toggleLeaveType(leaveType.key)} 
              />
              <label htmlFor={leaveType.key} className="text-sm cursor-pointer select-none">
                {leaveType.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading leave data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave data for {format(selectedMonth, "MMMM yyyy")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {leaveTypes
                  .filter(lt => selectedLeaveTypes.includes(lt.key))
                  .map((leaveType) => (
                    <Bar 
                      key={leaveType.key} 
                      dataKey={leaveType.key} 
                      name={leaveType.label} 
                      fill={leaveType.color} 
                      stackId="leaves" 
                    />
                  ))
                }
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}