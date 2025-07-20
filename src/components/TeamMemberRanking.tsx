import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamMemberSalesWithRank {
  teamMemberId: string;
  name: string;
  sales: number;
  rank: number;
  displayName?: string;
}

import { TeamMemberSales } from "@/types/square";

interface TeamMemberRankingProps {
  data: TeamMemberSales[];
}

export function TeamMemberRanking({ data }: TeamMemberRankingProps) {
  // Filter out team members with no sales and sort by sales descending
  const filteredData: TeamMemberSalesWithRank[] = data
    .filter(member => member.sales > 0)
    .sort((a, b) => b.sales - a.sales)
    .map((member, index) => ({
      ...member,
      rank: index + 1,
      displayName: member.name.length > 12 ? `${member.name.substring(0, 12)}...` : member.name
    }));

  return (
    <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-scale-in">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold">Team Member Sales Ranking</CardTitle>
        <CardDescription className="text-base">Top performing team members by net sales</CardDescription>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-base">
            No sales data available for selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={filteredData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              layout="horizontal"
            >
              <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-xl">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                              Rank #{data.rank}
                            </span>
                            <div className="font-semibold text-foreground">
                              {data.name}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground font-medium">
                              Net Sales
                            </span>
                            <div className="font-bold text-chart-blue text-lg">
                              ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="sales" 
                fill="hsl(var(--chart-blue))" 
                radius={[0, 4, 4, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}