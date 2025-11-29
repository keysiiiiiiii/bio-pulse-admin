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

        console.log('📊 [LeaveAnalyticsChart] Fetching leave data...');
        console.log('   Month:', format(selectedMonth, "MMMM yyyy"));
        console.log('   Range:', monthStart, 'to', monthEnd);

        // ✅ Query attendance_logs for leave records
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('leave_type, week_of_year, att_date, on_leave, leave_duration')
          .gte('att_date', monthStart)
          .lte('att_date', monthEnd)
          .eq('on_leave', true)  // ✅ Only get leave records
          .not('leave_type', 'is', null);

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        console.log('✅ Fetched records:', data?.length || 0);

        if (!data || data.length === 0) {
          console.log('⚠️ No leave data found for this month');
          setChartData([]);
          return;
        }

        // ✅ Debug: Show unique leave types
        const uniqueLeaveTypes = [...new Set(data.map(d => d.leave_type))];
        console.log('📋 Leave types found:', uniqueLeaveTypes);

        // ✅ Debug: Show week distribution
        const weekDistribution = data.reduce((acc, d) => {
          const week = d.week_of_year || 'null';
          acc[week] = (acc[week] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('📅 Week distribution:', weekDistribution);

        // ✅ Get all unique weeks from data (sorted)
        const weeksInMonth = [...new Set(data.map(d => d.week_of_year).filter(Boolean))].sort((a, b) => a - b);
        
        if (weeksInMonth.length === 0) {
          console.log('⚠️ No valid week_of_year values found');
          setChartData([]);
          return;
        }

        console.log('📅 Weeks to display:', weeksInMonth);

        // ✅ Transform data by week
        const transformedData = weeksInMonth.map(week => {
          const weekData: any = { month: `Week ${week}` };

          leaveTypes.forEach(lt => {
            const totalDays = data
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
              .reduce((sum, d) => sum + (Number(d.leave_duration) || 1), 0);

            weekData[lt.key] = totalDays;
          });

          return weekData;
        });

        console.log('📊 Transformed data:', transformedData);

        // ✅ Check if there's any data to display
        const hasAnyData = transformedData.some(week => {
          return leaveTypes.some(lt => week[lt.key] > 0);
        });

        console.log('✅ Has data to display:', hasAnyData);

        if (!hasAnyData) {
          console.log('⚠️ No leave data found after transformation');
        }

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
              <p className="text-xs mt-2">Try approving some leave requests and check again</p>
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