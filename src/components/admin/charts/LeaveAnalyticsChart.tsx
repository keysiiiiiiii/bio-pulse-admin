import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';

// ✅ FIXED: Match exact database values for leave_type
const leaveTypes = [
  { key: "Vacation Leave", label: "Vacation Leave", color: "#3b82f6" },
  { key: "Mandatory/Forced Leave", label: "Mandatory/Forced Leave", color: "#8b5cf6" },
  { key: "Sick Leave", label: "Sick Leave", color: "#ef4444" },
  { key: "Maternity Leave", label: "Maternity Leave", color: "#ec4899" },
  { key: "Paternity Leave", label: "Paternity Leave", color: "#06b6d4" },
  { key: "Special Privilege Leave", label: "Special Privilege Leave", color: "#22c55e" },
  { key: "Solo Parent Leave", label: "Solo Parent Leave", color: "#f43f5e" },
  { key: "Study Leave", label: "Study Leave", color: "#14b8a6" },
  { key: "10-Day VAWC Leave", label: "10-Day VAWC Leave", color: "#db2777" },
  { key: "Rehabilitation Privilege", label: "Rehabilitation Privilege", color: "#f97316" },
  { key: "Special Leave Benefits for Women", label: "Special Leave Benefits for Women", color: "#a855f7" },
  { key: "Special Emergency (Calamity) Leave", label: "Special Emergency (Calamity) Leave", color: "#eab308" },
  { key: "Adoption Leave", label: "Adoption Leave", color: "#6366f1" },
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
        
        console.log('🔍 Fetching leave data between:', monthStart, 'and', monthEnd);
        
        // ✅ FIXED: More flexible query
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('leave_type, week_of_year, att_date, on_leave, leave_duration')
          .gte('att_date', monthStart)
          .lte('att_date', monthEnd)
          .not('leave_type', 'is', null);
        
        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }
        
        console.log('✅ Fetched leave data (ALL):', data);
        console.log('📊 Total records:', data?.length || 0);
        
        // ✅ Filter records with on_leave = 1 or true
        const leaveRecords = data?.filter(d => d.on_leave === 1 || d.on_leave === true || d.on_leave === '1') || [];
        console.log('✅ Filtered leave records (on_leave=1):', leaveRecords);
        console.log('📊 Leave records count:', leaveRecords.length);
        
        if (leaveRecords.length === 0) {
          console.log('⚠️ No leave data found');
          
          // Debug: Show what leave types exist in the data
          if (data && data.length > 0) {
            const allLeaveTypes = [...new Set(data.map(d => d.leave_type).filter(Boolean))];
            console.log('📝 Available leave types in DB:', allLeaveTypes);
            console.log('📝 Sample records:', data.slice(0, 5));
          }
          
          setChartData([]);
          return;
        }
        
        // ✅ Show unique leave types for debugging
        const uniqueLeaveTypes = [...new Set(leaveRecords.map(d => d.leave_type))];
        console.log('📝 Unique leave types found:', uniqueLeaveTypes);
        
        // ✅ Generate week numbers for the month
        const weeksInMonth: number[] = [];
        const allWeeks = [...new Set(leaveRecords.map(d => d.week_of_year).filter(Boolean))].sort((a, b) => a - b);
        
        console.log('📅 Weeks found in data:', allWeeks);
        
        // If no weeks, calculate based on dates
        if (allWeeks.length === 0) {
          for (let w = 1; w <= 5; w++) {
            weeksInMonth.push(w);
          }
        } else {
          weeksInMonth.push(...allWeeks);
        }
        
        console.log('📅 Weeks to display:', weeksInMonth);
        
        // ✅ Transform data by week - sum leave_duration
        const transformedData = weeksInMonth.map(week => {
          const weekData: any = { month: `Week ${week}` };
          
          leaveTypes.forEach(lt => {
            // ✅ FIXED: Exact match or contains check (case-insensitive)
            const totalDays = leaveRecords
              .filter(d => {
                if (!d.leave_type) return false;
                
                const dbLeaveType = d.leave_type.trim().toLowerCase();
                const searchKey = lt.key.trim().toLowerCase();
                
                // Exact match or contains
                const matches = dbLeaveType === searchKey || 
                               dbLeaveType.includes(searchKey) || 
                               searchKey.includes(dbLeaveType);
                
                return d.week_of_year === week && matches;
              })
              .reduce((sum, d) => sum + (Number(d.leave_duration) || 1), 0); // Default to 1 if no duration
            
            weekData[lt.key] = totalDays;
          });
          
          return weekData;
        });
        
        console.log('📊 Transformed leave data:', transformedData);
        
        // ✅ Check if there's any data
        const hasAnyData = transformedData.some(week => {
          return leaveTypes.some(lt => week[lt.key] > 0);
        });
        
        console.log('📊 Has any data to display:', hasAnyData);
        
        setChartData(transformedData);
      } catch (error) {
        console.error('❌ Error fetching leave data:', error);
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
              <p>No leave data for {format(selectedMonth, "MMMM yyyy")}</p>
              <p className="text-xs mt-2">Check the console for debugging info</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
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
                      label={selectedLeaveTypes.length === 1 ? { position: 'inside', fill: '#fff', fontSize: 14 } : false}
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