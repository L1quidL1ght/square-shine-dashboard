import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopItem } from "@/types/square";

interface TopItemsChartProps {
  data: TopItem[];
}

const COLORS = [
  'hsl(var(--chart-blue))',
  'hsl(var(--chart-green))',
  'hsl(var(--chart-orange))',
  'hsl(var(--chart-purple))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#0088fe'
];

export function TopItemsChart({ data }: TopItemsChartProps) {
  const chartData = data.slice(0, 5).map((item, index) => ({
    name: item.name,
    value: item.revenue,
    quantity: item.quantity,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Items by Revenue</CardTitle>
        <CardDescription>Best performing menu items</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Item
                          </span>
                          <span className="font-bold">
                            {data.name}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Revenue
                          </span>
                          <span className="font-bold">
                            ${data.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Quantity Sold
                          </span>
                          <span className="font-bold">
                            {data.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}