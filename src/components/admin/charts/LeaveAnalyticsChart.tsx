import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", vacation: 12, sick: 8, emergency: 3 },
  { month: "Feb", vacation: 15, sick: 6, emergency: 4 },
  { month: "Mar", vacation: 10, sick: 10, emergency: 2 },
  { month: "Apr", vacation: 18, sick: 5, emergency: 5 },
  { month: "May", vacation: 20, sick: 7, emergency: 3 },
  { month: "Jun", vacation: 14, sick: 9, emergency: 4 },
];

export function LeaveAnalyticsChart() {
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
