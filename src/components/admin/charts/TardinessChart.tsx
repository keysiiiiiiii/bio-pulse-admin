import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { week: "Week 1", cas: 8, coe: 5, cba: 3 },
  { week: "Week 2", cas: 10, coe: 7, cba: 4 },
  { week: "Week 3", cas: 6, coe: 8, cba: 5 },
  { week: "Week 4", cas: 9, coe: 6, cba: 7 },
];

export function TardinessChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="cas" stroke="hsl(var(--primary))" name="College of Arts & Sciences" strokeWidth={2} />
        <Line type="monotone" dataKey="coe" stroke="hsl(var(--secondary))" name="College of Engineering" strokeWidth={2} />
        <Line type="monotone" dataKey="cba" stroke="hsl(var(--accent))" name="College of Business Admin" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
