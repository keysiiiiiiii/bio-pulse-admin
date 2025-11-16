import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
        const response = await fetch(`/api/attendance/leave-analytics?year=${year}&month=${month}`);
        if (!response.ok) {
          setChartData([]);
          return;
        }
        const data = await response.json();
        const transformedData = [];
        for (let week = 1; week <= 4; week++) {
          const weekData: any = { month: `Week ${week}` };
          leaveTypes.forEach(lt => {
            weekData[lt.key] = data.find((d: any) => d.week === week && d.leave_type?.toLowerCase().includes(lt.key))?.count || 0;
          });
          transformedData.push(weekData);
        }
        setChartData(transformedData);
      } catch (error) {
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
              <Checkbox id={leaveType.key} checked={selectedLeaveTypes.includes(leaveType.key)} onCheckedChange={() => toggleLeaveType(leaveType.key)} />
              <label htmlFor={leaveType.key} className="text-sm cursor-pointer select-none">{leaveType.label}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {leaveTypes.filter(lt => selectedLeaveTypes.includes(lt.key)).map((leaveType) => (
                <Bar key={leaveType.key} dataKey={leaveType.key} name={leaveType.label} fill={leaveType.color} stackId="leaves" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {loading && <div className="text-center py-4 text-muted-foreground">Loading...</div>}
      {!loading && chartData.length === 0 && <div className="text-center py-8 text-muted-foreground">No data for {format(selectedMonth, "MMMM yyyy")}</div>}
    </div>
  );
}
