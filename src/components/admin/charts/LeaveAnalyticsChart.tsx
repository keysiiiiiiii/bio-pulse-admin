import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { supabase } from '@/lib/supabase';

// ✅ FIXED: Map database values to display labels
const leaveTypes = [
  { key: "vacation", dbValues: ["vacation", "vacation leave"], label: "Vacation Leave", color: "#3b82f6" },
  { key: "forced", dbValues: ["forced", "mandatory/forced leave", "mandatory"], label: "Mandatory/Forced Leave", color: "#8b5cf6" },
  { key: "sick", dbValues: ["sick", "sick leave"], label: "Sick Leave", color: "#ef4444" },
  { key: "maternity", dbValues: ["maternity", "maternity leave"], label: "Maternity Leave", color: "#ec4899" },
  { key: "paternity", dbValues: ["paternity", "paternity leave"], label: "Paternity Leave", color: "#06b6d4" },
  { key: "privilege", dbValues: ["privilege", "special privilege leave"], label: "Special Privilege Leave", color: "#22c55e" },
  { key: "soloparent", dbValues: ["soloparent", "solo parent leave", "solo parent"], label: "Solo Parent Leave", color: "#f43f5e" },
  { key: "study", dbValues: ["study", "study leave"], label: "Study Leave", color: "#14b8a6" },
  { key: "vawc", dbValues: ["vawc", "10-day vawc leave", "10-day vawc"], label: "10-Day VAWC Leave", color: "#db2777" },
  { key: "rehab", dbValues: ["rehab", "rehabilitation privilege"], label: "Rehabilitation Privilege", color: "#f97316" },
  { key: "special", dbValues: ["special", "special leave benefits for women"], label: "Special Leave Benefits for Women", color: "#a855f7" },
  { key: "emergency", dbValues: ["emergency", "special emergency (calamity) leave", "calamity"], label: "Special Emergency (Calamity) Leave", color: "#eab308" },
  { key: "adoption", dbValues: ["adoption", "adoption leave"], label: "Adoption Leave", color: "#6366f1" },
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

  // ✅ FIXED: Better leave type matching function
  const matchLeaveType = (dbLeaveType: string | null) => {
    if (!dbLeaveType) return null;
    const normalized = dbLeaveType.trim().toLowerCase();
    
    for (const lt of leaveTypes) {
      if (lt.dbValues.some(val => normalized === val || normalized.includes(val) || val.includes(normalized))) {
        return lt.key;
      }
    }
    return null;
  };

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

        const { data, error } = await supabase
          .from('attendance_logs')
          .select('leave_type, week_of_year, att_date, on_leave')
          .gte('att_date', monthStart)
          .lte('att_date', monthEnd)
          .eq('on_leave', 1)
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

        // ✅ Map database leave types to chart keys
        const mappedData = data.map(d => ({
          ...d,
          matched_key: matchLeaveType(d.leave_type)
        }));

        console.log('🔗 Mapped data sample:', mappedData.slice(0, 3));

        // ✅ Get all unique weeks from data (sorted)
        const weeksInMonth = [...new Set(data.map(d => d.week_of_year).filter(Boolean))].sort((a, b) => a - b);
        
        if (weeksInMonth.length === 0) {
          console.log('⚠️ No valid week_of_year values found');
          setChartData([]);
          return;
        }

        console.log('📅 Weeks to display:', weeksInMonth);

        // ✅ FIXED: COUNT days instead of SUM leave_duration
        const transformedData = weeksInMonth.map(week => {
          const weekData: any = { month: `Week ${week}` };

          leaveTypes.forEach(lt => {
            // ✅ Count unique dates (days) instead of summing duration
            const daysOnLeave = new Set(
              mappedData
                .filter(d => d.week_of_year === week && d.matched_key === lt.key)
                .map(d => d.att_date)
            ).size;

            weekData[lt.key] = daysOnLeave;
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