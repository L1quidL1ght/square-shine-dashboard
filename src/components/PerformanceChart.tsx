import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyPerformance } from "@/types/square";

interface PerformanceChartProps {
  data: DailyPerformance[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Performance</CardTitle>
        <CardDescription>Sales and cover count over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis 
              dataKey="date" 
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Date
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {new Date(label).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Sales
                          </span>
                          <span className="font-bold">
                            ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Covers
                          </span>
                          <span className="font-bold">
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
            <Bar dataKey="sales" name="Sales ($)" fill="hsl(var(--chart-blue))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="covers" name="Covers" fill="hsl(var(--chart-green))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}