
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyPerformance } from "@/types/square";

interface PerformanceChartProps {
  data: DailyPerformance[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 animate-scale-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Daily Performance</CardTitle>
        <CardDescription className="text-base">Sales and cover count over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Date
                          </span>
                          <span className="font-semibold text-foreground">
                            {new Date(label).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Sales
                          </span>
                          <span className="font-bold text-chart-blue">
                            ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                            Covers
                          </span>
                          <span className="font-bold text-chart-green">
                            {payload[1].value}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar 
              dataKey="sales" 
              name="Sales ($)" 
              fill="hsl(var(--chart-blue))" 
              radius={[8, 8, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
            <Bar 
              dataKey="covers" 
              name="Covers" 
              fill="hsl(var(--chart-green))" 
              radius={[8, 8, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
