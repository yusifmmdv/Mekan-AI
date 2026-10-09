"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function AnalyticsChart({
  data,
  title,
}: {
  data: { name: string; count: number }[];
  title: string;
}) {
  if (!data.length || data.every((d) => d.count === 0))
    return <p className="muted">Qrafik üçün hələ hadisə qeydə alınmayıb.</p>;
  return (
    <figure aria-label={title}>
      <figcaption>{title}</figcaption>
      <div style={{ height: 260, width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, bottom: 30, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} width={40} />
            <Tooltip />
            <Bar
              dataKey="count"
              name="Qeydə alınan hadisələr"
              fill="#75614d"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
