
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
    <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-scale-in">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold">Top Selling Items</CardTitle>
        <CardDescription className="text-base">Best performing menu items by revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
              className="hover:opacity-80 transition-opacity"
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
                    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-xl">
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Item
                          </span>
                          <span className="font-bold text-foreground">
                            {data.name}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Revenue
                          </span>
                          <span className="font-bold text-chart-green">
                            ${data.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Quantity Sold
                          </span>
                          <span className="font-bold text-chart-blue">
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
